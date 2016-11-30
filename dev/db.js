import Sequelize from 'sequelize';
import path from 'path';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './data/database.sqlite',
});

export default sequelize;
