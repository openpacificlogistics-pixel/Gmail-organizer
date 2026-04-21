const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Gmail Manager is alive!'));
app.listen(process.env.PORT || 3000, () => console.log('Running'));
