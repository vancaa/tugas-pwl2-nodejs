import fetch from 'node-fetch';
import express from 'express';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import bcrypt from 'bcrypt';
import multer from 'multer';
import FormData from 'form-data';
import fs from 'fs';

const app = express();
const PORT = 3000;

const upload = multer({ dest: 'uploads/' });
// Tentukan __filename dan __dirname secara manual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- MIDDLEWARE & CONFIGURATION ---

// Set folder 'public' untuk file statis (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Set Body Parser (Agar bisa baca data dari form)
app.use(bodyParser.urlencoded({ extended: true }));

// Set Method Override (Agar bisa pakai PUT dan DELETE di HTML)
app.use(methodOverride('_method'));

// Set EJS untuk view
app.set('views', path.join(__dirname, 'views'));
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');

// --- ROUTES ---

// Route ke halaman utama
app.get('/', (req, res) => {
    res.render('index');
});

// Route: Tampilkan Daftar Pengguna (READ)
app.get('/users', async (req, res) => {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/users'); 
        const users = await response.json();
        res.render('user', { users: users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Error fetching users');
    }
});

// Route: Form Tambah Pengguna (CREATE - Form)
app.get('/users/create', (req, res) => {
    res.render('user_create');
});

// Route: Proses Tambah Pengguna (CREATE - Action)
app.post('/users', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10); // Hash password
        const response = await fetch('http://127.0.0.1:8000/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword
            })
        });
        res.redirect('/users');
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).send('Error creating user');
    }
});

// Route: Tampilkan Detail Pengguna (READ - Detail)
app.get('/users/:id', async (req, res) => {
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/users/${req.params.id}`);
        const user = await response.json();
        res.render('user_show', { user: user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).send('Error fetching user');
    }
});

// Route: Form Edit Pengguna (UPDATE - Form)
app.get('/users/:id/edit', async (req, res) => {
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/users/${req.params.id}`);
        const user = await response.json();
        res.render('user_update', { user: user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).send('Error fetching user');
    }
});

// Route: Proses Edit Pengguna (UPDATE - Action)
app.put('/users/:id', async (req, res) => {
    try {
        const dataToUpdate = {
            name: req.body.name,
            email: req.body.email
        };

        if (req.body.password) {
            const hashedPassword = await bcrypt.hash(req.body.password, 10); // Hash jika password diisi
            dataToUpdate.password = hashedPassword;
        }

        await fetch(`http://127.0.0.1:8000/api/users/${req.params.id}`, {
            method: 'PUT',
            headers: {
                // 'Authorization': API_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToUpdate)
        });
        res.redirect('/users');
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Error updating user');
    }
});

// Route: Hapus Pengguna (DELETE)
app.delete('/users/:id', async (req, res) => {
    try {
        await fetch(`http://127.0.0.1:8000/api/users/${req.params.id}`, {
            method: 'DELETE',
            // headers: { 'Authorization': API_TOKEN }
        });
        res.redirect('/users');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Error deleting user');
    }
});

// 1. READ: Tampilkan Semua Produk
app.get('/products', async (req, res) => {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/products/lihat'); 
        const products = await response.json();
        // Pastikan API Laravel mengembalikan array. Jika formatnya {data: [...]}, ganti jadi products.data
        res.render('product', { products: products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Error fetching products');
    }
});

// 2. CREATE: Form Tambah Produk
app.get('/products/create', (req, res) => {
    res.render('product_create');
});

// 3. CREATE: Proses Simpan Produk (Dengan Gambar)
// Tambahkan middleware 'upload.single('image')'
app.post('/products', upload.single('image'), async (req, res) => {
    try {
        // Siapkan data form untuk dikirim ke Laravel
        const form = new FormData();
        form.append('name', req.body.name);
        form.append('description', req.body.description);
        form.append('price', req.body.price);
        form.append('stock', req.body.stock);

        // Cek apakah ada file gambar yang diupload
        if (req.file) {
            // Baca file dari folder temp 'uploads/' dan kirim ke Laravel
            form.append('image', fs.createReadStream(req.file.path));
        }

        // Kirim ke API Laravel
        await fetch('http://127.0.0.1:8000/api/products', {
            method: 'POST',
            body: form,
            headers: form.getHeaders() // Penting: Header otomatis dari FormData
        });

        // Hapus file temporary setelah dikirim (Biar hemat storage)
        if (req.file) fs.unlinkSync(req.file.path);

        res.redirect('/products');
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).send('Error creating product');
    }
});

// 4. READ: Detail Produk
app.get('/products/:id', async (req, res) => {
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/products/${req.params.id}`);
        const product = await response.json();
        res.render('product_show', { product: product });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).send('Error fetching product');
    }
});

// 5. UPDATE: Form Edit Produk
app.get('/products/:id/edit', async (req, res) => {
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/products/${req.params.id}`);
        const product = await response.json();
        res.render('product_update', { product: product });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).send('Error fetching product');
    }
});

// 6. UPDATE: Proses Simpan Perubahan
app.put('/products/:id', async (req, res) => {
    try {
        await fetch(`http://127.0.0.1:8000/api/products/${req.params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: req.body.name,
                description: req.body.description,
                price: req.body.price,
                stock: req.body.stock
            })
        });
        res.redirect('/products');
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).send('Error updating product');
    }
});

// 7. DELETE: Hapus Produk
app.delete('/products/:id', async (req, res) => {
    try {
        await fetch(`http://127.0.0.1:8000/api/products/${req.params.id}`, {
            method: 'DELETE'
        });
        res.redirect('/products');
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).send('Error deleting product');
    }
});
app.listen(PORT, () => {
    console.log(`Server running at http://127.0.0.1:${PORT}`);
});