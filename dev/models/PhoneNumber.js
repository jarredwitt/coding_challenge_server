import Sequelize from 'sequelize';

import db from '../db';

const PhoneNumber = db.define('phone_number', {
  number: {
    type: Sequelize.STRING,
    field: 'number'
  },
  confirmationCode: {
    type: Sequelize.INTEGER,
    field: 'confirmation_code',
  }
});

export default PhoneNumber;
