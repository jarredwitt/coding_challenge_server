import Sequelize from 'sequelize';

import Application from './Application';
import Member from './Member';
import db from '../db';

const Vehicle = db.define('Vehicle', {
  licensePlate: {
    type: Sequelize.STRING,
    field: 'license_plate',
  },
  make: Sequelize.STRING,
  model: Sequelize.STRING,
  year: Sequelize.INTEGER,
  application_id: {
    type: Sequelize.INTEGER,
    references: {
      model: Application,
      key: 'id'
    }
  },
  ownerId: {
    type: Sequelize.INTEGER,
    field: 'owner_id',
    references: {
      model: Member,
      key: 'id'
    }
  }
});

export default Vehicle;
