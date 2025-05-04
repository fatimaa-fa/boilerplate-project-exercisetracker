const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

//added code
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//added code
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

// POST /api/users
app.post('/api/users', async (req, res) => {
  const user = new User({ username: req.body.username });
  const savedUser = await user.save();
  res.json({ username: savedUser.username, _id: savedUser._id });
});

// GET /api/users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, '_id username');
  res.json(users);
});

// POST /api/users/:_id/exercises
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const user = await User.findById(req.params._id);
  if (!user) return res.status(400).send('User not found');
  const exercise = new Exercise({
    userId: user._id,
    description,
    duration: parseInt(duration),
    date: date ? new Date(date) : new Date()
  });
  const savedExercise = await exercise.save();
  res.json({
    _id: user._id,
    username: user.username,
    date: savedExercise.date.toDateString(),
    duration: savedExercise.duration,
    description: savedExercise.description
  });
});

// GET /api/users/:_id/logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const user = await User.findById(req.params._id);
  if (!user) return res.status(400).send('User not found');

  let filter = { userId: user._id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  let query = Exercise.find(filter).select('description duration date');
  if (limit) query = query.limit(parseInt(limit));
  const log = await query.exec();

  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log: log.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }))
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
