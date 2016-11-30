import Sequelize from 'sequelize';

import Application from './Application';
import db from '../db';

const Member = db.define('Member', {
  age: Sequelize.INTEGER,
  email: Sequelize.STRING,
  gender: Sequelize.STRING,
  first: Sequelize.STRING,
  last: Sequelize.STRING,
  application_id: {
    type: Sequelize.INTEGER,
    references: {
      model: Application,
      key: 'id'
    }
  }
});

export default Member;
