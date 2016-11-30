import express from 'express';
import bodyParser from 'body-parser';

import db from './db';
import applicationRoutes from './routes/application';

let app = express();

app.use(bodyParser.json());

app.use('/application', applicationRoutes);

app.use((err, req, res, next) => {
  res.status(err.status || 500).send({
    code: err.code,
    message: err.message
  });
});

db.sync({ force: false }).then(() => {
  app.listen(8000, () => {
    console.log('API listening on port 8000');
  });
});
