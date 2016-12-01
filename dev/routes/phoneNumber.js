import express from 'express';

import Application from '../models/Application';
import Member from '../models/Member';
import PhoneNumber from '../models/PhoneNumber';
import Vehicle from '../models/Vehicle';

const router = express.Router();

async function lookupCurrentApplication(phoneNumber) {
  const currentApplicationResult = await Application.findOne({
    where: {
      phoneNumber: phoneNumber,
    },
    include: [{
      model: Member,
      as: 'members'
    }, {
      model: Vehicle,
      as: 'vehicles'
    }]
  });

  if (!currentApplicationResult) {
    return {};
  }

  const { members: finalMembers, vehicles: finalVehicles, ...applicationData } = currentApplicationResult.toJSON();

  return {
    application: applicationData,
    members: finalMembers,
    vehicles: finalVehicles,
  };
}

// Confirm the confirmation code for the phone number and look to see if there is
// a current application for the number.
router.post('/confirm', async (req, res, next) => {
  try {
    let { phoneNumber, confirmationCode } = req.body;
    if (!phoneNumber || !confirmationCode) {
      return next({ status: 400, message: 'Phone number and confirmation code must be included in request.' });
    }

    const phoneNumberResult = await PhoneNumber.findOne({ where: { number: phoneNumber }});
    if (!phoneNumberResult) {
      return next({ status: 400, message: 'Phone number or confirmation code is incorrect.' });
    }

    if (typeof confirmationCode === 'string') {
      confirmationCode = confirmationCode * 1;
    }
    const confirmed = phoneNumberResult.confirmationCode === confirmationCode;

    if (!confirmed) {
      return next({ status: 400, message: 'Phone number or confirmation code is incorrect.' });
    }

    const currentApplicationResult = await lookupCurrentApplication(phoneNumber);

    res.send(currentApplicationResult);
  } catch (error) {
    next({ status: 500, message: error.message });
  }
});

// Ideally this would be where we would create a confirmation code and send out a validation text.
// We mock out the behavior by just creating a default confirmation code of 8585
router.post('/validate', async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return next({ status: 400, message: 'Phone number must be included in request.' });
    }

    const phoneNumberResult = await PhoneNumber.findOrCreate({ where: { number: phoneNumber }, limit: 1 });

    if (!phoneNumberResult.length) {
      return next({ status: 400, message: 'Phone number cannot be validated.' });
    }

    const result = phoneNumberResult[0];

    await result.update({ confirmationCode: 8585 });

    res.status(204).end();
  } catch (error) {
    next({ status: 500, message: error.message });
  }
});

export default router;
