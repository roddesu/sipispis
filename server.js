const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3003;

app.use(cors({
  origin: ['http://192.168.1.3:3003'], 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // 
  database: 'safespacedb',
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL Database.');
});


const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: 'ubsafespace@gmail.com', 
    pass: 'qzxh dvor jfhr pics', 
  },
});

app.post('/register', (req, res) => {
  const { email, password } = req.body;
  console.log('Register request:', req.body);

  const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
  db.query(checkEmailQuery, [email], (err, results) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    }

    if (results.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiration = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes expiration

    const hashedPassword = bcrypt.hashSync(password, 10);

    const query = `
      INSERT INTO users (email, password, otp, otp_expired_at, is_verified)
      VALUES (?, ?, ?, ?, false);
    `;

    db.query(query, [email, hashedPassword, otp, otpExpiration], (err) => {
      if (err) {
        console.error('Database Error:', err);
        return res.status(500).json({ success: false, message: 'Database error', error: err.message });
      }

      const mailOptions = {
        from: 'ubsafespace@gmail.com',
        to: email,
        subject: 'Your OTP for Registration',
        text: `Your OTP is: ${otp}`,
      };

      transporter.sendMail(mailOptions, (error) => {
        if (error) {
          console.error('Email Error:', error);
          return res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
        }

        res.status(200).json({ success: true, message: 'OTP sent successfully' });
      });
    });
  });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [user] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const storedHashedPassword = user[0].password;
    const isValidPassword = await bcrypt.compare(password, storedHashedPassword);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid password.' });
    }

    if (!user[0].is_verified) {
      return res.status(403).json({ success: false, message: 'Account not verified.' });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user[0].id,
        email: user[0].email,
      },
    });
  } catch (error) {
    console.error('Server error during login:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

app.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

 
  const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Email not registered' });
    }

    db.query('INSERT INTO otps (email, otp) VALUES (?, ?) ON DUPLICATE KEY UPDATE otp = ?', [email, otp, otp], (err) => {
      if (err) {
        console.error('Database error during OTP update:', err.message);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      const mailOptions = {
        from: 'ubsafespace@gmail.com',
        to: email,
        subject: 'Password Reset OTP',
        text: `Your OTP for password reset is: ${otp}`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error while sending email:', error);
          return res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
        }

        console.log('Email sent successfully:', info.response);
        res.status(200).json({ success: true, message: 'OTP sent successfully' });
      });
    });
  });
});

app.post('/verify-forgot-password-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  const query = `SELECT otp, otp_expired_at FROM users WHERE email = ?`;

  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    const userOtp = results[0].otp;
    const otpExpiration = new Date(results[0].otp_expired_at);

    if (String(otp) !== String(userOtp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (new Date() > otpExpiration) {
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    res.status(200).json({ success: true, message: 'OTP verified successfully. Proceed to reset password.' });
  });
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  const query = `SELECT otp, otp_expired_at, is_verified FROM users WHERE email = ?`;

  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userOtp = results[0].otp;
    const otpExpiration = new Date(results[0].otp_expired_at);
    const isVerified = results[0].is_verified;

    if (isVerified === 1) {
      return res.status(400).json({ success: false, message: 'User is already verified' });
    }

    if (String(otp) !== String(userOtp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (new Date() > otpExpiration) {
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    const updateQuery = `UPDATE users SET is_verified = 1 WHERE email = ?`;

    db.query(updateQuery, [email], (updateErr, updateResults) => {
      if (updateErr) {
        console.error('Database Error:', updateErr);
        return res.status(500).json({ success: false, message: 'Failed to update verification status' });
      }

      if (updateResults.affectedRows === 0) {
        console.error('No rows were updated');
        return res.status(500).json({ success: false, message: 'No rows updated, verification failed' });
      }

      res.status(200).json({ success: true, message: 'OTP verified successfully. User is now verified.' });
    });
  });
});

app.post('/reset-password', (req, res) => {
  const { email, otp, newPassword, confirmPassword } = req.body;

  console.log('Request body:', req.body); 

  if (!email || !otp || !newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  const query = `SELECT otp, otp_expired_at FROM users WHERE email = ? AND otp = ?;`;

  db.query(query, [email, otp], (err, results) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    const otpExpiration = new Date(results[0].otp_expired_at);

 
    if (new Date() > otpExpiration) {
      return res.status(400).json({ success: false, message: 'OTP expired.' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    const updateQuery = `UPDATE users SET password = ?, otp = NULL, otp_expired_at = NULL, last_password_reset_at = NOW() WHERE email = ?;`;

    db.query(updateQuery, [hashedPassword, email], (err, result) => {
      if (err) {
        console.error('Database Error during password reset:', err);
        return res.status(500).json({ success: false, message: 'Failed to reset password.' });
      }

      res.status(200).json({ success: true, message: 'Password reset successfully.' });
    });
  });
});



app.post('/create-post', async (req, res) => {
  const { userId, content } = req.body;

  if (!userId || !content) {
    return res.status(400).json({ success: false, message: 'User ID and content are required' });
  }

  const query = `
    INSERT INTO posts (user_id, post_content)
    VALUES (?, ?);
  `;

  try {
    const [result] = await db.promise().query(query, [userId, content]);

    const newPost = {
      post_id: result.insertId,
      user_id: userId,
      post_content: content,
      post_created_at: new Date().toISOString(),
      post_updated_at: null,  
    };

    res.status(201).json({ success: true, message: 'Post created successfully', postId: result.insertId, post: newPost });
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create post' });
  }
});


app.get('/get-posts', async (req, res) => {
  try {
    const [posts] = await db.promise().query('SELECT posts.post_id, posts.user_id, posts.post_content, posts.comment_count, posts.post_created_at, users.email FROM posts INNER JOIN users ON posts.user_id = users.id ORDER BY posts.post_created_at DESC');
    
    res.json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
});


app.post('/create-comment', async (req, res) => {
  const { postId, userId, comment } = req.body;

  if (!postId || !comment) {
    return res.status(400).json({ message: 'Missing required fields: postId or comment' });
  }

  try {
    const [post] = await db.promise().query('SELECT * FROM posts WHERE post_id = ?', [postId]);
    if (post.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

   
    const query = `INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`;
    const [result] = await db.promise().query(query, [postId, userId, comment]);

   
    const updateQuery = 'UPDATE posts SET comment_count = comment_count + 1 WHERE post_id = ?';
    await db.promise().query(updateQuery, [postId]);

    res.status(201).json({
      message: 'Comment posted successfully',
      comment: {
        id: result.insertId,
        postId,
        userId,
        content: comment,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Error creating comment', error: error.message });
  }
});


app.get('/get-comments/:postId', async (req, res) => {
  const postId = req.params.postId;
  try {
    const [comments] = await db.promise().query('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC', [postId]);
    res.status(200).json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Error fetching comments' });
  }
});


app.put('/update-post/:postId', async (req, res) => {
  const postId = req.params.postId;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }

  const updateQuery = 'UPDATE posts SET post_content = ?, post_updated_at = NOW() WHERE post_id = ?';

  try {
    await db.promise().query(updateQuery, [content, postId]);
    res.status(200).json({ message: 'Post updated successfully' });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Failed to update post' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://192.168.1.3:${port}`);
});