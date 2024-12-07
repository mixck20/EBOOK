import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const app = express();

// MIDDLEWARE
app.use(express.json());
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    optionsSuccessStatus: 200
}));

// DATABASE CONNECTION
const dbConnect = () => {
    return mysql.createConnection({
        host     : process.env.DB_HOST,
        user     : process.env.DB_USER,
        password : process.env.DB_PASS,
        database : process.env.DB_NAME
    });
};

// GET Books with optional search filters (Book Name, Author, Genre)
app.get('/story_books', async (req, res) => {
    let connection;
    const { author_name, book_name, genre } = req.query;
  
    let query = 'SELECT * FROM story_book WHERE 1=1';
    const queryParams = [];
  
 
    const escapeLikeString = (str) => str.replace(/[%_]/g, '\\$&'); 
  
    if (author_name) {
      const escapedAuthorName = escapeLikeString(author_name);
      query += ' AND author_name LIKE ?';
      queryParams.push(`%${escapedAuthorName}%`);
    }
  
    if (book_name) {
      const escapedBookName = escapeLikeString(book_name);
      query += ' AND book_name LIKE ?';
      queryParams.push(`%${escapedBookName}%`);
    }
  
    if (genre) {
      const escapedGenre = escapeLikeString(genre);
      query += ' AND genre LIKE ?';
      queryParams.push(`%${escapedGenre}%`);
    }
  
    try {
      connection = await dbConnect();
      console.log('Query:', query);
      console.log('Params:', queryParams);
  
      const [rows] = await connection.execute(query, queryParams);
  
  
      res.json(rows || []);
    } catch (err) {
      console.error('Error:', err.message);
      res.status(500).json({ message: 'An error has occurred!', error: err.message });
    } finally {
      if (connection) await connection.end();
    }
  });



// GET Book by ID
app.get('/story_books/:book_id', async (req, res) => {
  const { book_id } = req.params;
  console.log('Fetching book with ID:', book_id);
  let connection;

  try {
      connection = await dbConnect();
      const [rows] = await connection.execute('SELECT * FROM story_book WHERE book_id = ?', [book_id]);

      if (rows.length > 0) {
          res.json(rows[0]);
      } else {
          res.status(404).json({ message: `No book found with ID ${book_id}.` });
      }
  } catch (err) {
      res.status(500).json({ message: 'Error fetching the book', error: err.message });
  } finally {
      if (connection) await connection.end();
  }
});



// POST STORY_BOOK
app.post('/publish', async (req, res) => {
  console.log('Received data:', req.body);

  const { book_name, author_name, genre, description, publish_date, status, image, read } = req.body;

  if (!book_name || !author_name || !genre || !publish_date) {
    return res.status(400).json({ message: 'Missing required fields (book_name, author_name, genre, publish_date)' });
  }

  const parsedDate = new Date(publish_date);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ message: 'Invalid publish_date format. Date must be in yyyy-MM-dd format.' });
  }

  const descriptionValue = description === undefined ? null : description;
  const statusValue = status || 'ongoing';
  const imageValue = image || null; 
  const readValue = read || null; 

  let connection, result;

  try {
    connection = await dbConnect();

    result = await connection.execute(
      'INSERT INTO story_book (book_name, author_name, genre, description, publish_date, status, image, `read`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [book_name, author_name, genre, descriptionValue, parsedDate.toISOString().split('T')[0], statusValue, imageValue, readValue]
    );

    console.log('Database insert result:', result);
    res.json({ message: 'New story book added!', book_id: result[0].insertId });
  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ message: 'An error has occurred!', error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});

// UPDATE STORY_BOOK
app.put('/story_books/:book_id', async (req, res) => {
  const { book_id } = req.params;
  const { book_name, author_name, genre, description, publish_date, status, image, read } = req.body;

  if (!book_name || !author_name || !genre || !publish_date || !status) {
    return res.json({ message: 'Missing required fields (book_name, author_name, genre, publish_date, status)' });
  }

  const descriptionValue = description === undefined ? null : description;
  const statusValue = status;
  const readValue = read || null;

  let connection, result;

  try {
    connection = await dbConnect();

    result = await connection.execute(
      'UPDATE story_book SET book_name = ?, author_name = ?, genre = ?, description = ?, publish_date = ?, status = ?, image = ?, `read` = ? WHERE book_id = ?',
      [book_name, author_name, genre, descriptionValue, publish_date, statusValue, image, readValue, book_id]
    );

    if (result[0].affectedRows === 0) {
      res.json({ message: 'No book found with the provided ID' });
    } else {
      res.json({ message: 'Story book updated!' });
    }
  } catch (err) {
    res.json({ message: 'An error has occurred!', error: err.message });
  } finally {
    if (connection) await connection.end();
  }
});


// DELETE STORY_BOOK
app.delete('/story_books/:book_id', async (req, res) => {
    const { book_id } = req.params;

    let connection, result;

    try {
        connection = await dbConnect();
        result = await connection.execute('DELETE FROM story_book WHERE book_id = ?', [book_id]);

        if (result[0].affectedRows === 0) {
            res.json({ message: 'No book found with the provided ID' });
        } else {
            res.json({ message: 'Story book deleted!' });
        }
    } catch (err) {
        res.json({ message: 'An error has occurred!', error: err.message });
    } finally {
        if (connection) await connection.end();
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Node server is running on port ${port}`));
