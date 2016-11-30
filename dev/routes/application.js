import express from 'express';
import Sequelize from 'sequelize';

import Application from '../models/Application';
import Member from '../models/Member';
import Vehicle from '../models/Vehicle';

const router = express.Router();

router.get('/', async (req, res) => {
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
    console.log(error);
  }
});

router.get('/:id', async (req, res) => {
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
    console.log(error);
  }
});

router.post('/', async (req, res) => {
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
    console.log(error);
  }
});

router.post('/:id', async (req, res) => {
  try {
    const { application, members, vehicles } = req.body;

    const { id: applicationId, ...applicationProps } = application;
    await Application.update(applicationProps, { where: { id: applicationId }});

    // find current members and update
    const currentMemberIdMappings = {};
    const currentMembers = members.filter(member => !member.local && !member.removed);
    const currentMemberPromises = currentMembers.map(member => {
      const { id, ...memberProps } = member;
      currentMemberIdMappings[id] = id;
      return Member.update(memberProps, { where: { id }});
    });

    await Promise.all(currentMemberPromises);

    // find new members and create while maintaining the temp ids
    const newMemberIdMappings = {};
    const newMemberPromises = members.filter(member => member.local).map((member, index) => {
      const { id, local, ...otherProps } = member;
      newMemberIdMappings[index] = id;
      return Member.create({
        ...otherProps,
        application_id: applicationId,
      })
    });

    // store the newly created records so we can map a vehicle if any
    const newMemberResults = await Promise.all(newMemberPromises);
    newMemberResults.forEach((member, index) => {
      currentMemberIdMappings[newMemberIdMappings[index]] = member.id;
    });

    const reconciledVehicles = vehicles.map(vehicle => {
      const { ownerId, ...otherProps } = vehicle;
      return {
        ...otherProps,
        ownerId: currentMemberIdMappings[ownerId],
      }
    });

    const currentVehicles = reconciledVehicles.filter(vehicle => !vehicle.local && !vehicle.removed);
    const currentVehiclePromises = currentVehicles.map(vehicle => {
      const { id, ...vehicleProps } = vehicle;
      return Vehicle.update(vehicleProps, { where: { id }});
    });

    await Promise.all(currentVehiclePromises);

    const newVehiclePromises = reconciledVehicles.filter(vehicle => vehicle.local).map(vehicle => {
      const { id, ...otherProps } = vehicle;

      return Vehicle.create({
        ...otherProps,
        application_id: applicationId,
      })
    });

    await Promise.all(newVehiclePromises);

    const removeVehiclePromises = reconciledVehicles.filter(vehicle => vehicle.removed).map(vehicle => Vehicle.destroy({ where: { id: vehicle.id }}));
    const removeMemberPromises = members.filter(member => member.removed).map(member => Member.destroy({ where: { id: member.id }}));

    await Promise.all([...removeVehiclePromises, ...removeMemberPromises]);

    const fullApplicationResult = await Application.findById(applicationId, {
      include: [{
        model: Member,
        as: 'members'
      }, {
        model: Vehicle,
        as: 'vehicles'
      }]
    });

    const { members: finalMembers, vehicles: finalVehicles, ...applicationData } = fullApplicationResult.toJSON();

    res.send({
      application: applicationData,
      members: finalMembers,
      vehicles: finalVehicles,
    });
  } catch (error) {
    console.log(error);
  }
});

export default router;
