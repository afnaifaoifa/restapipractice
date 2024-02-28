const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const cookieParser = require('cookie-parser'); // Подключаем cookie-parser

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

mongoose.connect('mongodb+srv://exclusiveshahzod:zh0YsqKsMMMJ2HCM@cluster0.p7nhdnz.mongodb.net/mydatabase')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  isAdmin: { type: Boolean, default: false },
  creationDate: { type: Date, default: Date.now },
  updateDate: { type: Date, default: Date.now },
  deletionDate: { type: Date, default: null }
});
const User = mongoose.model('User', userSchema);

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  genre: String,
  publicationYear: Number,
  quantityAvailable: Number,
  price: Number,
});
const Book = mongoose.model('Book', bookSchema);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Используем cookie-parser

const authenticateUser = (req, res, next) => {
  const token = req.cookies.token; // Получаем токен из cookies
  if (!token) {
    return res.redirect('/login');
  }

  jwt.verify(token, 'secret', (err, decoded) => {
    if (err) {
      return res.redirect('/login');
    }
    req.user = decoded;
    next();
  });
};

app.get('/', async (req, res) => {
  try {
    const books = await Book.find();
    res.render('index', { books: books });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const token = jwt.sign({ username: user.username, role: user.role }, 'secret');
    res.cookie('token', token, { httpOnly: true });
    
    if (user.isAdmin) {
      return res.redirect('/admin/books');
    } else {
      return res.redirect('/');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/books', async (req, res) => {
  try {
    const books = await Book.find();
    res.render('books', { books: books });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/books/:id', async (req, res) => {
    try {
      const bookId = req.params.id;
      const book = await Book.findById(bookId);
      if (!book) {
        return res.status(404).render('error', { message: 'Book not found' }); // Render error template
      }
      res.render('buks', { books: books }); // Pass book data to the template
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  

  app.get('/admin/books', authenticateUser, async (req, res) => {
    try {
      const books = await Book.find();
      res.render('buks', { books: books });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

app.get('/admin/books/:id', authenticateUser, async (req, res) => {
  try {
    const bookId = req.params.id;
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.render('admin_books', { book: book });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/admin/books', authenticateUser, async (req, res) => {
  try {
    const { title, author, genre, publicationYear, quantityAvailable, price } = req.body;
    const newBook = new Book({
      title: title,
      author: author,
      genre: genre,
      publicationYear: publicationYear,
      quantityAvailable: quantityAvailable,
      price: price
    });
    await newBook.save();
    res.redirect('/admin/books');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/admin/books/:id', authenticateUser, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { title, author, genre, publicationYear, quantityAvailable, price } = req.body;
    const updatedBook = await Book.findByIdAndUpdate(bookId, {
      title: title,
      author: author,
      genre: genre,
      publicationYear: publicationYear,
      quantityAvailable: quantityAvailable,
      price: price
    }, { new: true });
    if (!updatedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.redirect('/admin/books');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/admin/books/:id', authenticateUser, async (req, res) => {
  try {
    const bookId = req.params.id;
    const deletedBook = await Book.findByIdAndDelete(bookId);
    if (!deletedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.redirect('/admin/books'); // После удаления книги перенаправляем на страницу со списком книг
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
