import Sequelize from 'sequelize';

import db from '../db';

import Member from './Member';
import Vehicle from './Vehicle';

const Application = db.define('application', {
  address: Sequelize.STRING,
  city: Sequelize.STRING,
  confirmationCode: {
    type: Sequelize.INTEGER,
    field: 'confirmation_code'
  },
  numberOfBedrooms: {
    type: Sequelize.INTEGER,
    field: 'number_of_bedrooms'
  },
  phoneNumber: {
    type: Sequelize.STRING,
    field: 'phone_number'
  },
  state: Sequelize.STRING,
  zip: Sequelize.STRING,
});

Application.hasMany(Member, { as: 'members', foreignKey: 'application_id' });
Application.hasMany(Vehicle, { as: 'vehicles', foreignKey: 'application_id' });

export default Application;
