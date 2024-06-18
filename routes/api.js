'use strict';

const { MongoClient, ObjectId } = require('mongodb');
const MONGO_URI = process.env.MONGO_URI;

let client;
let db;

async function connectToDatabase() {
  if (!client || !client.isConnected()) {
    client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    db = client.db();
  }
}

module.exports = function (app) {

  app.route('/api/issues/:project')
    .get(async function (req, res) {
      await connectToDatabase();
      let project = req.params.project;
      let query = req.query;
      try {
        const issues = await db.collection(project).find(query).toArray();
        res.json(issues);
      } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve issues' });
      }
    })
    
    .post(async function (req, res) {
      await connectToDatabase();
      let project = req.params.project;
      const { issue_title, issue_text, created_by, assigned_to, status_text } = req.body;
      if (!issue_title || !issue_text || !created_by) {
        return res.json({ error: 'required field(s) missing' });
      }
      const newIssue = {
        issue_title,
        issue_text,
        created_by,
        assigned_to: assigned_to || '',
        status_text: status_text || '',
        created_on: new Date(),
        updated_on: new Date(),
        open: true
      };
      try {
        const result = await db.collection(project).insertOne(newIssue);
        res.json(result.ops[0]);
      } catch (error) {
        res.status(500).json({ error: 'Failed to create issue' });
      }
    })
    
    .put(async function (req, res) {
      await connectToDatabase();
      let project = req.params.project;
      const { _id, ...fieldsToUpdate } = req.body;
      if (!_id) {
        return res.json({ error: 'missing _id' });
      }
      const updatedFields = Object.keys(fieldsToUpdate).reduce((acc, key) => {
        if (fieldsToUpdate[key]) {
          acc[key] = fieldsToUpdate[key];
        }
        return acc;
      }, {});
      if (Object.keys(updatedFields).length === 0) {
        return res.json({ error: 'no update field(s) sent', '_id': _id });
      }
      updatedFields.updated_on = new Date();
      try {
        const result = await db.collection(project).updateOne({ _id: new ObjectId(_id) }, { $set: updatedFields });
        if (result.modifiedCount === 0) {
          res.json({ error: 'could not update', '_id': _id });
        } else {
          res.json({ result: 'successfully updated', '_id': _id });
        }
      } catch (error) {
        res.status(500).json({ error: 'could not update', '_id': _id });
      }
    })
    
    .delete(async function (req, res) {
      await connectToDatabase();
      let project = req.params.project;
      const { _id } = req.body;
      if (!_id) {
        return res.json({ error: 'missing _id' });
      }
      try {
        const result = await db.collection(project).deleteOne({ _id: new ObjectId(_id) });
        if (result.deletedCount === 0) {
          res.json({ error: 'could not delete', '_id': _id });
        } else {
          res.json({ result: 'successfully deleted', '_id': _id });
        }
      } catch (error) {
        res.status(500).json({ error: 'could not delete', '_id': _id });
      }
    });

};
