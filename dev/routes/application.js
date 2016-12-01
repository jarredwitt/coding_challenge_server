import express from 'express';

import Application from '../models/Application';
import Member from '../models/Member';
import Vehicle from '../models/Vehicle';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const allApplicationsResult = await Application.findAll({
      include: [{
        model: Member,
        as: 'members'
      }, {
        model: Vehicle,
        as: 'vehicles'
      }]
    });

    const result = allApplicationsResult.map(application => application.toJSON());

    res.send(result);
  } catch (error) {
    next({ status: 500, message: error.message });
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const fullApplicationResult = await Application.findById(id, {
      include: [{
        model: Member,
        as: 'members'
      }, {
        model: Vehicle,
        as: 'vehicles'
      }]
    });

    res.send(fullApplicationResult.toJSON());
  } catch (error) {
    next({ status: 500, message: error.message });
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { application, members, vehicles } = req.body;

    const applicationResult = await Application.create(application);

    const memberIdMappings = {};
    const memberPromises = members.filter(member => !member.removed).map((member, index) => {
      const { id, local, ...otherProps } = member;
      memberIdMappings[id] = index;
      return Member.create({
        ...otherProps,
        application_id: applicationResult.id,
      })
    });

    const membersResults = await Promise.all(memberPromises);

    const vehiclePromises = vehicles.filter(vehicle => !vehicle.removed).map(vehicle => {
      const { id, ownerId, ...otherProps } = vehicle;
      const owner = membersResults[memberIdMappings[ownerId]];

      return Vehicle.create({
        ...otherProps,
        ownerId: owner.id,
        application_id: applicationResult.id,
      })
    });

    const vehiclesResults = await Promise.all(vehiclePromises);

    res.send({
      application: applicationResult.toJSON(),
      members: membersResults.map(member => member.toJSON()),
      vehicles: vehiclesResults.map(vehicle => vehicle.toJSON()),
    });
  } catch (error) {
    next({ status: 500, message: error.message });
  }
});

router.post('/:id', async (req, res, next) => {
  try {
    const { application, members, vehicles } = req.body;

    // update the application first
    const { id: applicationId, ...applicationProps } = application;
    await Application.update(applicationProps, { where: { id: applicationId }});

    // find current members and update
    const currentMemberIdMappings = {};
    const currentMemberPromises = members.filter(member => !member.local && !member.removed).map(member => {
      const { id, ...memberProps } = member;
      currentMemberIdMappings[id] = id;
      return Member.update(memberProps, { where: { id }});
    });
    await Promise.all(currentMemberPromises);

    // create new members while maintaining the temp ids
    const newMemberIdMappings = {};
    const newMemberPromises = members.filter(member => member.local).map((member, index) => {
      const { id, local, ...otherProps } = member;
      newMemberIdMappings[index] = id;
      return Member.create({
        ...otherProps,
        application_id: applicationId,
      })
    });

    // store the newly created records
    const newMemberResults = await Promise.all(newMemberPromises);

    // replace the temp ids for new members with the new record ids
    newMemberResults.forEach((member, index) => {
      currentMemberIdMappings[newMemberIdMappings[index]] = member.id;
    });

    // reconcile the vehicle owner ids with the member ids
    const reconciledVehicles = vehicles.map(vehicle => {
      const { ownerId, ...otherProps } = vehicle;
      return {
        ...otherProps,
        ownerId: currentMemberIdMappings[ownerId],
      }
    });

    // update any current vehicles
    const currentVehiclePromises = reconciledVehicles.filter(vehicle => !vehicle.local && !vehicle.removed).map(vehicle => {
      const { id, ...vehicleProps } = vehicle;
      return Vehicle.update(vehicleProps, { where: { id }});
    });
    await Promise.all(currentVehiclePromises);

    // create new vehicles
    const newVehiclePromises = reconciledVehicles.filter(vehicle => vehicle.local).map(vehicle => {
      const { id, ...otherProps } = vehicle;

      return Vehicle.create({
        ...otherProps,
        application_id: applicationId,
      })
    });
    await Promise.all(newVehiclePromises);

    // remove the members and vehicles that have been removed from the application
    const removeVehiclePromises = reconciledVehicles.filter(vehicle => vehicle.removed).map(vehicle => Vehicle.destroy({ where: { id: vehicle.id }}));
    const removeMemberPromises = members.filter(member => member.removed).map(member => Member.destroy({ where: { id: member.id }}));

    await Promise.all([...removeVehiclePromises, ...removeMemberPromises]);

    // Finally, fetch the application with the member and vehicle relations
    const fullApplicationResult = await Application.findById(applicationId, {
      include: [{
        model: Member,
        as: 'members'
      }, {
        model: Vehicle,
        as: 'vehicles'
      }]
    });

    // transform the response to the correct application, members, vehicles format for the mobile application
    const { members: finalMembers, vehicles: finalVehicles, ...applicationData } = fullApplicationResult.toJSON();

    res.send({
      application: applicationData,
      members: finalMembers,
      vehicles: finalVehicles,
    });
  } catch (error) {
    next({ status: 500, message: error.message });
  }
});

export default router;
