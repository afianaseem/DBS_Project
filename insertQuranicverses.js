const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors middleware
const app = express();
const { MongoClient, ObjectId } = require('mongodb');
const config = require('./config');
const path = require('path');
// Use body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection
let db;async function connectToDatabase() {
    const client = new MongoClient(config.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        db = client.db(config.dbName);
        // Ensure the favourites collection exists
        let collections = await db.listCollections({ name: 'favourites' }).toArray();
        if (collections.length === 0) {
            // Create the favourites collection
            favouritesCollection = await db.createCollection('favourites');
            console.log('Created the favourites collection.');
        } else {
            favouritesCollection = db.collection('favourites');
            console.log('The favourites collection already exists.');
        }

        // Ensure the bookmarks collection exists
        collections = await db.listCollections({ name: 'bookmarks' }).toArray();
        if (collections.length === 0) {
            // Create the bookmarks collection
            bookmarksCollection = await db.createCollection('bookmarks');
            console.log('Created the bookmarks collection.');
        } else {
            bookmarksCollection = db.collection('bookmarks');
            console.log('The bookmarks collection already exists.');
        }

        // Ensure the users collection exists
        const userCollections = await db.listCollections({ name: 'users' }).toArray();
        if (userCollections.length === 0) {
            usersCollection = await db.createCollection('users');
            console.log('Created the users collection.');
        } else {
            usersCollection = db.collection('users');
            console.log('The users collection already exists.');
        }
        // Call the main function to insert Quranic verses data
        // await main();
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

// Use the cors middleware
app.use(cors());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Fetch surahs route
app.get('/surahs', async (req, res) => {
    try {
        const surahs = await db.collection('surahs').find({}).toArray();
        res.json(surahs);
    } catch (error) {
        console.error('Error fetching surahs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Fetch verses route
app.get('/surah/:surahNo', async (req, res) => {
    const { surahNo } = req.params;
    try {
        const verses = await db.collection('ayat').find({ surahNo: parseInt(surahNo) }).toArray();
        res.json(verses);
    } catch (error) {
        console.error('Error fetching verses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/urdu/:surahNo', async (req, res) => {
    const { surahNo } = req.params;
    try {
        const urdu = await db.collection('urdutranslation').find({ surahNo: parseInt(surahNo) }).toArray();
        res.json(urdu);
    } catch (error) {
        console.error('Error fetching urdu:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/favourites/:userno', async (req, res) => {
    const user = (req.params.userno); // Get user from URL parameters and convert to an integer if needed
    console.log("Received request for user:", user);
    try {
        // Query to find favourites with the given user
        const query = { user: user };
        console.log("Query to be executed:", query);
        const favourites = await db.collection('favourites').find(query).toArray();
        console.log("Query executed. Result:", favourites);

        // Log the results of the query
        if (favourites.length === 0) {
            console.log("No favourites found for user:", user);
        } else {
            console.log("Favourites found:", favourites);
        }
        res.json(favourites);
    } catch (error) {
        console.error('Error fetching favourites:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/checkpassword/:userno', async (req, res) => {
    const userno = req.params.userno;
    const { oldPassword } = req.body;
    try {
        const user = await usersCollection.findOne({ userno });
        if (!user || user.password !== oldPassword) {
            return res.status(400).json({ message: 'Old password does not match' });
        }
        res.status(200).json({ message: 'Old password verified' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Change password
app.post('/changepassword/:userno', async (req, res) => {
    const userno = req.params.userno;
    const { newPassword } = req.body;
    try {
        const result = await usersCollection.updateOne({ userno }, { $set: { password: newPassword } });
        if (result.modifiedCount === 1) {
            res.status(200).json({ message: 'Password changed successfully' });
        } else {
            res.status(400).json({ message: 'Failed to change password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
app.get('/eng/:surahNo', async (req, res) => {
    const { surahNo } = req.params;
    try {
        const english = await db.collection('englishtranslation').find({ surahNo: parseInt(surahNo) }).toArray();
        res.json(english);
    } catch (error) {
        console.error('Error fetching eng:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/favourites/surah/:surahNo/:surahName/:user', async (req, res) => {
    const { surahNo, surahName, user } = req.params;
    try {
        // Check if the Surah already exists in the favorites collection for the specified user
        const existingSurah = await favouritesCollection.findOne({ surahNo: parseInt(surahNo), user: user });
        if (existingSurah) {
            return res.status(200).json({ message: 'Surah already in favorites' });
        }
        // Add the Surah to the favorites collection for the specified user
        await favouritesCollection.insertOne({ surahNo: parseInt(surahNo), surahName: surahName, user: user });
        res.status(200).json({ message: 'Surah added to favorites' });
    } catch (error) {
        console.error('Error adding surah to favorites:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.delete('/closefavourite/:surahNo/:user', async (req, res) => {
    const { surahNo, user } = req.params;
    try {
        const result = await db.collection('favourites').deleteOne({ surahNo: parseInt(surahNo), user: user });
        console.log("Deleted", result.deletedCount, "document(s) with surah number:", surahNo);
        // Check if any document was deleted
        if (result.deletedCount === 1) {
            res.status(200).json({ message: 'Surah removed from favorites successfully' });
        } else {
            res.status(404).json({ message: 'Surah not found in favorites' });
        }
    } catch (error) {
        console.error('Error removing surah from favorites:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.delete('/delete/:userno', async (req, res) => {
    const userno = (req.params.userno); // Parse the user number to an integer
    const session = await db.client.startSession(); // Start a MongoDB transaction session
    session.startTransaction(); // Start a transaction
    try {
        // Delete the user from the 'users' collection
        const userResult = await db.collection('users').deleteOne({ userno: userno }, { session });
        // Delete the user's data from the 'favourites' collection
        const favouritesResult = await db.collection('favourites').deleteMany({ user: userno }, { session });
        // Commit the transaction if both delete operations were successful
        await session.commitTransaction();
        session.endSession();
        // Check if any documents were deleted from 'users'
        if (userResult.deletedCount === 1) {
            res.status(200).json({ message: 'User deleted successfully' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        // Abort the transaction if any error occurs
        await session.abortTransaction();
        session.endSession();
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/getlatestuserno', async (req, res) => {
    console.log('Received request for latest user number.');
    try {
        // Find the document with the highest userno
        console.log('Fetching latest user number from the database...');
        const latestUser = await db.collection('users').find().sort({ userno: -1 }).limit(1).toArray();
        const latestUserno = latestUser.length > 0 ? latestUser[0].userno : 0;
        console.log('Latest user number:', latestUserno);
        res.json({ userno: latestUserno });
    } catch (error) {
        console.error('Error fetching latest user number:', error);
        res.status(500).json({ error: 'An error occurred while fetching latest user number' });
    }
});
app.post('/signup/:email/:password/:confirmpassword/:userno', async (req, res) => {
    const { email, password, confirmpassword, userno } = req.params;
    try {
        // Check if the email already exists in the users collection
        const existingUser = await usersCollection.findOne({ email: email });
        if (existingUser) {
            return res.status(200).json({ message: 'Account already exists' });
        }
        // Check if the password and confirm password match
        if (password !== confirmpassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }
        // Add the user's email, password, and user number to the users collection
        await usersCollection.insertOne({ email: email, password: password, userno: userno });
        res.status(200).json({ message: 'Signup successful' });
    } catch (error) {
        console.error('Error creating account:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/login/:email/:password', async (req, res) => {
    const { email, password } = req.params;
    console.log(`Received login request for email: ${email}`);
    try {
        // Check if the email exists in the users collection
        const user = await usersCollection.findOne({ email: email });
        if (!user) {
            const message = `Account not found for email: ${email}`;
            console.log(message);
            return res.status(404).json({ message: message });
        }
        // Check if the provided password matches the stored password
        if (user.password !== password) {
            const message = `Incorrect password for email: ${email}`;
            console.log(message);
            return res.status(401).json({ message: message });
        }
        // Successful login
        console.log(`Login successful for email: ${email}, userno: ${user.userno}`);
        res.status(200).json({ message: 'Login successful', userno: user.userno });
    } catch (error) {
        const message = 'Internal server error';
        console.error(message, error);
        res.status(500).json({ message: message });
    }
});
app.post('/bookmarks/:surahName/:surahNo/:ayatNo/:userno', async (req, res) => {
    const { surahName, surahNo, ayatNo, userno } = req.params;
    const bookmarksCollection = db.collection('bookmarks');
    try {
        // Log input parameters
        console.log("Request received with parameters:", { surahName, surahNo, ayatNo, userno });
        // Ensure the combination of surahNo, ayatNo, and userno is unique
        const existingBookmark = await bookmarksCollection.findOne({ surahNo, ayatNo, userno });
        // Log the query result
        console.log("Existing bookmark check result:", existingBookmark);
        if (existingBookmark) {
            return res.status(409).json({ message: 'Bookmark already exists' });
        }
        // If the bookmark does not exist, insert the new bookmark
        await bookmarksCollection.insertOne({ surahName, surahNo, ayatNo, userno });
        // Log successful insertion
        console.log("Bookmark added successfully");
        res.status(201).json({ message: 'Bookmark added successfully' });
    } catch (error) {
        console.error('Error adding bookmark:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
app.get('/bookmarks/:userno', async (req, res) => {
    const userno = req.params.userno; // Get user number from URL parameters
    console.log("Received request for bookmarks of user:", userno);
    try {
        // Query to find bookmarks with the given user number
        const query = { userno: (userno) }; // Convert userno to integer if needed
        console.log("Query to be executed:", query);
        const bookmarks = await db.collection('bookmarks').find(query).toArray();
        console.log("Query executed. Result:", bookmarks);
        // Log the results of the query
        if (bookmarks.length === 0) {
            console.log("No bookmarks found for user:", userno);
        } else {
            console.log("Bookmarks found:", bookmarks);
        }
        res.json(bookmarks);
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.delete('/closebookmark/:surahName/:surahNo/:ayatNo/:userno', async (req, res) => {
    const { surahName, surahNo, ayatNo, userno } = req.params;
    const bookmarksCollection = db.collection('bookmarks');
    try {
        const result = await bookmarksCollection.deleteOne({
            surahName,
            surahNo: (surahNo),
            ayatNo: (ayatNo),
            userno: (userno)
        });
        if (result.deletedCount === 1) {
            res.status(200).json({ message: 'Bookmark removed successfully' });
        } else {
            res.status(404).json({ message: 'Bookmark not found' });
        }
    } catch (error) {
        console.error('Error removing bookmark:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
app.get('/word/:surahNo', async (req, res) => {
    const { surahNo } = req.params;
    try {
        const translations = await db.collection('wordbyword').find({ surahNo: parseInt(surahNo) }).sort({ ayatNo: 1, wordNo: 1 }).toArray();
        res.json(translations);
    } catch (error) {
        console.error('Error fetching word-by-word translations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/Duas', async (req, res) => {
    try {
        const translations = await db.collection('Duas').find().toArray();
        res.json(translations);
    } catch (error) {
        console.error('Error fetching duas:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    connectToDatabase();
});

async function main() {
    // Create a new MongoClient
    const client = new MongoClient(config.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    try {
        // Connect the client to the server
        await client.connect();
        console.log('Connected to MongoDB');
        // Connect to the specific database
        const db = client.db(config.dbName);
        console.log(`Connected to database: ${config.dbName}`);
        // Insert Quranic verses data
       await insertQuranicVerses(db);
    } catch (err) {
        console.error('Error: ', err);
    } finally {
        // Close the client
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

function generateAyatId(surahNo, ayatNo) {
    return new ObjectId();
}

async function insertQuranicVerses(db) {
    const surahsCollection = db.collection('surahs');
    const ayatCollection = db.collection('ayat');
    const DuasCollection = db.collection('Duas');
    // Insert surah data
    const id_of_surah_1 = new ObjectId();
    const id_of_surah_2 = new ObjectId();
    const id_of_surah_3 = new ObjectId();
    const id_of_surah_4 = new ObjectId();
    const id_of_surah_5 = new ObjectId();
    const id_of_surah_6 = new ObjectId();
    const id_of_surah_7 = new ObjectId();
    const id_of_surah_8 = new ObjectId();
    const id_of_surah_9 = new ObjectId();
    const id_of_surah_10 = new ObjectId();
    const id_of_surah_11 = new ObjectId();
    const id_of_surah_12 = new ObjectId();

    // Insert documents into the Surah collection
    await surahsCollection.insertMany([
        { surahNo: 1, surahName: 'Kauthar', noOfAyats: 3, surahId: id_of_surah_1,audio: '1.mp3' },
        { surahNo: 2, surahName: 'Asr', noOfAyats: 3, surahId: id_of_surah_2 ,audio: '2.mp3'},
        { surahNo: 3, surahName: 'Nasr', noOfAyats: 3, surahId: id_of_surah_3,audio: '3.mp3' },
        { surahNo: 4, surahName: 'Quraish', noOfAyats: 4, surahId: id_of_surah_4,audio: '4.mp3' },
        { surahNo: 5, surahName: 'Fatiha', noOfAyats: 6, surahId: id_of_surah_5,audio: '5.mp3' },
        { surahNo: 6, surahName: 'Qadar', noOfAyats: 5, surahId: id_of_surah_6 },
        { surahNo: 7, surahName: 'Falak', noOfAyats: 5, surahId: id_of_surah_7 },
        { surahNo: 8, surahName: 'Fil', noOfAyats: 5, surahId: id_of_surah_8 },
        { surahNo: 9, surahName: 'Masad', noOfAyats: 5, surahId: id_of_surah_9 },
        { surahNo: 10, surahName: 'Ikhlas', noOfAyats: 4, surahId: id_of_surah_10 },
        { surahNo: 11, surahName: 'Kafirun', noOfAyats: 6, surahId: id_of_surah_11 },
        { surahNo: 12, surahName: 'Nas', noOfAyats: 6, surahId: id_of_surah_12 }]);
    console.log('Inserted sample surah data');
    const numOfSurahs = 12;
    let ayatsPerSurah = 0;
    const ayatIds = {}; // Object to store ayat IDs
    for (let surahNo = 1; surahNo <= numOfSurahs; surahNo++) {
        if (surahNo === 1 || surahNo === 2 || surahNo === 3)
            ayatsPerSurah = 3;
        else if (surahNo === 4 || surahNo === 10)
            ayatsPerSurah = 4;
        else if (surahNo === 6 || surahNo === 7 || surahNo === 8 || surahNo === 9)
            ayatsPerSurah = 5;
        else if (surahNo === 11 || surahNo === 12 || surahNo === 5)
            ayatsPerSurah = 6;
        for (let ayatNo = 1; ayatNo <= ayatsPerSurah; ayatNo++) {
            let ayatId = generateAyatId(surahNo, ayatNo);
            ayatIds[`${surahNo}_${ayatNo}`] = ayatId; // Store ayat ID in the object with key `${surahNo}_${ayatNo}`
        }
    }
    await ayatCollection.insertMany([
        //Surah no 1
        { ayatNo: 1, ayatId: ayatIds['1_1'], surahNo: 1, surahId: id_of_surah_1, text: 'إِنَّآ أَعْطَيْنَـٰكَ ٱلْكَوْثَرَ' },
        { ayatNo: 2, ayatId: ayatIds['1_2'], surahNo: 1, surahId: id_of_surah_1, text: 'فَصَلِّ لِرَبِّكَ وَٱنْحَرْ' },
        { ayatNo: 3, ayatId: ayatIds['1_3'], surahNo: 1, surahId: id_of_surah_1, text: 'إِنَّ شَانِئَكَ هُوَ ٱلْأَبْتَرُ' },
            
        // surah no 2
        { ayatNo: 1, ayatId: ayatIds['2_1'], surahNo: 2, surahId: id_of_surah_2, text: 'وَٱلْعَصْرِ' },
        { ayatNo: 2, ayatId: ayatIds['2_2'], surahNo: 2, surahId: id_of_surah_2, text: 'إِنَّ ٱلْإِنسَـٰنَ لَفِى خُسْرٍ' },
        { ayatNo: 3, ayatId: ayatIds['2_3'], surahNo: 2, surahId: id_of_surah_2, text: 'إِلَّا ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّـٰلِحَـٰتِ وَتَوَاصَوْا۟ بِٱلْحَقِّ وَتَوَاصَوْا۟ بِٱلصَّبْرِ' },

        //surah 3
        { ayatNo: 1, ayatId: ayatIds['3_1'], surahNo: 3, surahId: id_of_surah_3, text: 'إِذَا جَآءَ نَصْرُ ٱللَّهِ وَٱلْفَتْحُ' },
        { ayatNo: 2, ayatId: ayatIds['3_2'], surahNo: 3, surahId: id_of_surah_3, text: 'وَرَأَيْتَ ٱلنَّاسَ يَدْخُلُونَ فِى دِينِ ٱللَّهِ أَفْوَاجًۭا' },
        { ayatNo: 3, ayatId: ayatIds['3_3'], surahNo: 3, surahId: id_of_surah_3, text: 'فَسَبِّحْ بِحَمْدِ رَبِّكَ وَٱسْتَغْفِرْهُ ۚ إِنَّهُۥ كَانَ تَوَّابًۢا' },

        //surah 4
        { ayatNo: 1, ayatId: ayatIds['4_1'], surahNo: 4, surahId: id_of_surah_4, text: 'لِإِيلَـٰفِ قُرَيْشٍ' },
        { ayatNo: 2, ayatId: ayatIds['4_2'], surahNo: 4, surahId: id_of_surah_4, text: 'إِۦلَـٰفِهِمْ رِحْلَةَ ٱلشِّتَآءِ وَٱلصَّيْفِ' },
        { ayatNo: 3, ayatId: ayatIds['4_3'], surahNo: 4, surahId: id_of_surah_4, text: 'فَلْيَعْبُدُوا۟ رَبَّ هَـٰذَا ٱلْبَيْتِ' },
        { ayatNo: 4, ayatId: ayatIds['4_4'], surahNo: 4, surahId: id_of_surah_4, text: 'ٱلَّذِىٓ أَطْعَمَهُم مِّن جُوعٍۢ وَءَامَنَهُم مِّنْ خَوْفٍۭ' },
        // surah 5
        { ayatNo: 1, ayatId: ayatIds['5_1'], surahNo: 5, surahId: id_of_surah_5, text: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ' },
        { ayatNo: 2, ayatId: ayatIds['5_2'], surahNo: 5, surahId: id_of_surah_5, text: 'ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ' },
        { ayatNo: 3, ayatId: ayatIds['5_3'], surahNo: 5, surahId: id_of_surah_5, text: 'مَـٰلِكِ يَوْمِ ٱلدِّينِ' },
        { ayatNo: 4, ayatId: ayatIds['5_4'], surahNo: 5, surahId: id_of_surah_5, text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ' },
        { ayatNo: 5, ayatId: ayatIds['5_5'], surahNo: 5, surahId: id_of_surah_5, text: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ' },
        { ayatNo: 6, ayatId: ayatIds['5_6'], surahNo: 5, surahId: id_of_surah_5, text: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ' },
                
        // surah 6
        { ayatNo: 1, ayatId: ayatIds['6_1'], surahNo: 6, surahId: id_of_surah_6, text: 'إِنَّآ أَنزَلْنَـٰهُ فِى لَيْلَةِ ٱلْقَدْرِ' },
        { ayatNo: 2, ayatId: ayatIds['6_2'], surahNo: 6, surahId: id_of_surah_6, text: 'وَمَآ أَدْرَىٰكَ مَا لَيْلَةُ ٱلْقَدْرِ' },
        { ayatNo: 3, ayatId: ayatIds['6_3'], surahNo: 6, surahId: id_of_surah_6, text: 'لَيْلَةُ ٱلْقَدْرِ خَيْرٌۭ مِّنْ أَلْفِ شَهْرٍۢ' },
        { ayatNo: 4, ayatId: ayatIds['6_4'], surahNo: 6, surahId: id_of_surah_6, text: 'تَنَزَّلُ ٱلْمَلَـٰٓئِكَةُ وَٱلرُّوحُ فِيهَا بِإِذْنِ رَبِّهِم مِّن كُلِّ أَمْرٍۢ' },
        { ayatNo: 5, ayatId: ayatIds['6_5'], surahNo: 6, surahId: id_of_surah_6, text: 'سَلَـٰمٌ هِىَ حَتَّىٰ مَطْلَعِ ٱلْفَجْرِ' },
        
        //surah no 7
        { ayatNo: 1, ayatId: ayatIds['7_1'], surahNo: 7, surahId: id_of_surah_7, text: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ' },
        { ayatNo: 2, ayatId: ayatIds['7_2'], surahNo: 7, surahId: id_of_surah_7, text: 'مِن شَرِّ مَا خَلَقَ' },
        { ayatNo: 3, ayatId: ayatIds['7_3'], surahNo: 7, surahId: id_of_surah_7, text: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ' },
        { ayatNo: 4, ayatId: ayatIds['7_4'], surahNo: 7, surahId: id_of_surah_7, text: 'وَمِن شَرِّ ٱلنَّفَّـٰثَـٰتِ فِى ٱلْعُقَدِ' },
        { ayatNo: 5, ayatId: ayatIds['7_5'], surahNo: 7, surahId: id_of_surah_7, text: 'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ' },
        
        //surah 8
        { ayatNo: 1, ayatId: ayatIds['8_1'], surahNo: 8, surahId: id_of_surah_8, text: 'أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَـٰبِ ٱلْفِيلِ' },
        { ayatNo: 2, ayatId: ayatIds['8_2'], surahNo: 8, surahId: id_of_surah_8, text: 'أَلَمْ يَجْعَلْ كَيْدَهُمْ فِى تَضْلِيلٍۢ' },
        { ayatNo: 3, ayatId: ayatIds['8_3'], surahNo: 8, surahId: id_of_surah_8, text: 'وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ' },
        { ayatNo: 4, ayatId: ayatIds['8_4'], surahNo: 8, surahId: id_of_surah_8, text: 'تَرْمِيهِم بِحِجَارَةٍۢ مِّن سِجِّيلٍۢ' },
        { ayatNo: 5, ayatId: ayatIds['8_5'], surahNo: 8, surahId: id_of_surah_8, text: 'فَجَعَلَهُمْ كَعَصْفٍۢ مَّأْكُولٍۭ' },
            
        //surah 9
        { ayatNo: 1, ayatId: ayatIds['9_1'], surahNo: 9, surahId: id_of_surah_9, text: 'تَبَّتْ يَدَآ أَبِى لَهَبٍۢ وَتَبَّ' },
        { ayatNo: 2, ayatId: ayatIds['9_2'], surahNo: 9, surahId: id_of_surah_9, text: 'مَآ أَغْنَىٰ عَنْهُ مَالُهُۥ وَمَا كَسَبَ' },
        { ayatNo: 3, ayatId: ayatIds['9_3'], surahNo: 9, surahId: id_of_surah_9, text: 'سَيَصْلَىٰ نَارًۭا ذَاتَ لَهَبٍۢ' },
        { ayatNo: 4, ayatId: ayatIds['9_4'], surahNo: 9, surahId: id_of_surah_9, text: 'وَٱمْرَأَتُهُۥ حَمَّالَةَ ٱلْحَطَبِ' },
        { ayatNo: 5, ayatId: ayatIds['9_5'], surahNo: 9, surahId: id_of_surah_9, text: 'فِى جِيدِهَا حَبْلٌۭ مِّن مَّسَدٍۭ' },
        
        // surah 10
        { ayatNo: 1, ayatId: ayatIds['10_1'], surahNo: 10, surahId: id_of_surah_10, text: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ' },
        { ayatNo: 2, ayatId: ayatIds['10_2'], surahNo: 10, surahId: id_of_surah_10, text: 'ٱللَّهُ ٱلصَّمَدُ' },
        { ayatNo: 3, ayatId: ayatIds['10_3'], surahNo: 10, surahId: id_of_surah_10, text: 'لَمْ يَلِدْ وَلَمْ يُولَدْ' },
        { ayatNo: 4, ayatId: ayatIds['10_4'], surahNo: 10, surahId: id_of_surah_10, text: 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ' },
    
        //surah 11
        { ayatNo: 1, ayatId: ayatIds['11_1'], surahNo: 11, surahId: id_of_surah_11, text: 'قُلْ يَـٰٓأَيُّهَا ٱلْكَـٰفِرُونَ' },
        { ayatNo: 2, ayatId: ayatIds['11_2'], surahNo: 11, surahId: id_of_surah_11, text: 'لَآ أَعْبُدُ مَا تَعْبُدُونَ' },
        { ayatNo: 3, ayatId: ayatIds['11_3'], surahNo: 11, surahId: id_of_surah_11, text: 'وَلَآ أَنتُمْ عَـٰبِدُونَ مَآ أَعْبُدُ' },
        { ayatNo: 4, ayatId: ayatIds['11_4'], surahNo: 11, surahId: id_of_surah_11, text: 'وَلَآ أَنَا۠ عَابِدٌۭ مَّا عَبَدتُّمْ' },
        { ayatNo: 5, ayatId: ayatIds['11_5'], surahNo: 11, surahId: id_of_surah_11, text: 'وَلَآ أَنتُمْ عَـٰبِدُونَ مَآ أَعْبُدُ' },
        { ayatNo: 6, ayatId: ayatIds['11_6'], surahNo: 11, surahId: id_of_surah_11, text: 'لَكُمْ دِينُكُمْ وَلِىَ دِينِ' },

        // surah 12
        { ayatNo: 1, ayatId: ayatIds['12_1'], surahNo: 12, surahId: id_of_surah_12, text: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ' },
        { ayatNo: 2, ayatId: ayatIds['12_2'], surahNo: 12, surahId: id_of_surah_12, text: 'مَلِكِ ٱلنَّاسِ' },
        { ayatNo: 3, ayatId: ayatIds['12_3'], surahNo: 12, surahId: id_of_surah_12, text: 'إِلَـٰهِ ٱلنَّاسِ' },
        { ayatNo: 4, ayatId: ayatIds['12_4'], surahNo: 12, surahId: id_of_surah_12, text: 'مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ' },
        { ayatNo: 5, ayatId: ayatIds['12_5'], surahNo: 12, surahId: id_of_surah_12, text: 'ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ' },
        { ayatNo: 6, ayatId: ayatIds['12_6'], surahNo: 12, surahId: id_of_surah_12, text: 'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ' },]);

    //WORD BY WORD
    const wordbywordCollection = db.collection('wordbyword');
    await wordbywordCollection.insertMany([
        { ayatNo: 1, ayatId: 1, surahNo: 1, surahId: id_of_surah_1, wordNo: 1, arabicWord: 'إِنَّآ', englishTranslation: 'Indeed, We' },
        { ayatNo: 1, ayatId: 1, surahNo: 1, surahId: id_of_surah_1, wordNo: 2, arabicWord: 'أَعْطَيْنَٰكَ', englishTranslation: 'have given you,' },
        { ayatNo: 1, ayatId: 1, surahNo: 1, surahId: id_of_surah_1, wordNo: 3, arabicWord: 'ٱلْكَوْثَرَ', englishTranslation: 'Al-Kauthar,' },
        { ayatNo: 2, ayatId: 2, surahNo: 1, surahId: id_of_surah_1, wordNo: 1, arabicWord: 'فَصَلِّ', englishTranslation: 'So pray' },
        { ayatNo: 2, ayatId: 2, surahNo: 1, surahId: id_of_surah_1, wordNo: 2, arabicWord: 'لِرَبِّكَ', englishTranslation: 'to your Lord' },
        { ayatNo: 2, ayatId: 2, surahNo: 1, surahId: id_of_surah_1, wordNo: 3, arabicWord: 'وَانْحَرْ', englishTranslation: 'and sacrifice' },
        { ayatNo: 3, ayatId: 3, surahNo: 1, surahId: id_of_surah_1, wordNo: 1, arabicWord: 'إِنَّ', englishTranslation: 'Indeed' },
        { ayatNo: 3, ayatId: 3, surahNo: 1, surahId: id_of_surah_1, wordNo: 2, arabicWord: 'شَانِئَكَ', englishTranslation: 'your enemy -' },
        { ayatNo: 3, ayatId: 3, surahNo: 1, surahId: id_of_surah_1, wordNo: 3, arabicWord: 'هُوَ', englishTranslation: 'he (is)' },
        { ayatNo: 3, ayatId: 3, surahNo: 1, surahId: id_of_surah_1, wordNo: 4, arabicWord: 'ٱلْأَبْتَرُ', englishTranslation: 'the one cut off' }
,
        //surah 2
        // Verse 1
        { ayatNo: 1, ayatId: 1, surahNo: 2, surahId: id_of_surah_2, wordNo: 1, arabicWord: 'وَٱلْعَصْرِ', englishTranslation: 'By the time' },
        // Verse 2
        { ayatNo: 2, ayatId: 2, surahNo: 2, surahId: id_of_surah_2, wordNo: 1, arabicWord: 'إِنَّ', englishTranslation: 'Indeed' },
        { ayatNo: 2, ayatId: 2, surahNo: 2, surahId: id_of_surah_2, wordNo: 2, arabicWord: 'ٱلْإِنسَٰنَ', englishTranslation: 'mankind' },
        { ayatNo: 2, ayatId: 2, surahNo: 2, surahId: id_of_surah_2, wordNo: 3, arabicWord: 'لَفِى', englishTranslation: '(is) surely in' },
        { ayatNo: 2, ayatId: 2, surahNo: 2, surahId: id_of_surah_2, wordNo: 4, arabicWord: 'خُسْرٍ', englishTranslation: 'loss' },
        // Verse 3
        { ayatNo: 3, ayatId: 3, surahNo: 2, surahId: id_of_surah_2, wordNo: 1, arabicWord: 'إِلَّا', englishTranslation: 'Except' },
        { ayatNo: 3, ayatId: 3, surahNo: 2, surahId: id_of_surah_2, wordNo: 2, arabicWord: 'ٱلَّذِينَ', englishTranslation: 'those who' },
        { ayatNo: 3, ayatId: 3, surahNo: 2, surahId: id_of_surah_2, wordNo: 3, arabicWord: 'ءَامَنُوا۟', englishTranslation: 'believe' },
        { ayatNo: 3, ayatId: 3, surahNo: 2, surahId: id_of_surah_2, wordNo: 4, arabicWord: 'وَعَمِلُوا۟', englishTranslation: 'and do' },
        { ayatNo: 3, ayatId: 3, surahNo: 2, surahId: id_of_surah_2, wordNo: 5, arabicWord: 'ٱلصَّٰلِحَٰتِ', englishTranslation: 'righteous deeds' },
        { ayatNo: 3, ayatId: 3, surahNo: 2, surahId: id_of_surah_2, wordNo: 6, arabicWord: 'وَتَوَاصَوْا۟', englishTranslation: 'and enjoin each other' },
        { ayatNo: 3, ayatId: 3, surahNo: 2, surahId: id_of_surah_2, wordNo: 7, arabicWord: 'بِٱلْحَقِّ', englishTranslation: 'to the truth' },
        { ayatNo: 3, ayatId: 3, surahNo: 2, surahId: id_of_surah_2, wordNo: 8, arabicWord: 'وَتَوَاصَوْا۟', englishTranslation: 'and enjoin each other' },
        { ayatNo: 3, ayatId: 3, surahNo: 2, surahId: id_of_surah_2, wordNo: 9, arabicWord: 'بِٱلصَّبْرِ', englishTranslation: 'to [the] patience' }

        //surah3
        // ayat1
        ,{ ayatNo: 1, ayatId: 1, surahNo: 3, surahId: id_of_surah_3, wordNo: 1, arabicWord: 'اِذَا', englishTranslation: 'When' },
        { ayatNo: 1, ayatId: 1, surahNo: 3, surahId: id_of_surah_3, wordNo: 2, arabicWord: 'جَاۤءَ', englishTranslation: 'comes' },
        { ayatNo: 1, ayatId: 1, surahNo: 3, surahId: id_of_surah_3, wordNo: 3, arabicWord: 'نَصْرُ', englishTranslation: '(the) Help' },
        { ayatNo: 1, ayatId: 1, surahNo: 3, surahId: id_of_surah_3, wordNo: 4, arabicWord: 'اللّٰهِ', englishTranslation: 'of Allah' },
        { ayatNo: 1, ayatId: 1, surahNo: 3, surahId: id_of_surah_3, wordNo: 5, arabicWord: 'وَالْفَتْحُ', englishTranslation: 'and the Victory' },
        // ayat2
        { ayatNo: 2, ayatId: 2, surahNo: 3, surahId: id_of_surah_3, wordNo: 1, arabicWord: 'وَرَاَيْتَ', englishTranslation: 'And you see' },
        { ayatNo: 2, ayatId: 2, surahNo: 3, surahId: id_of_surah_3, wordNo: 2, arabicWord: 'النَّاسَ', englishTranslation: 'the people' },
        { ayatNo: 2, ayatId: 2, surahNo: 3, surahId: id_of_surah_3, wordNo: 3, arabicWord: 'يَدْخُلُوْنَ', englishTranslation: 'entering' },
        { ayatNo: 2, ayatId: 2, surahNo: 3, surahId: id_of_surah_3, wordNo: 4, arabicWord: 'فِيْ', englishTranslation: 'into' },
        { ayatNo: 2, ayatId: 2, surahNo: 3, surahId: id_of_surah_3, wordNo: 5, arabicWord: 'دِيْنِ', englishTranslation: '(the) religion' },
        { ayatNo: 2, ayatId: 2, surahNo: 3, surahId: id_of_surah_3, wordNo: 6, arabicWord: 'اللّٰهِ', englishTranslation: 'of Allah' },
        { ayatNo: 2, ayatId: 2, surahNo: 3, surahId: id_of_surah_3, wordNo: 7, arabicWord: 'اَفْوَاجًا', englishTranslation: '(in) multitudes' },
        //ayat 3
        { ayatNo: 3, ayatId: 3, surahNo: 3, surahId: id_of_surah_3, wordNo: 1, arabicWord: 'فَسَبِّحْ', englishTranslation: 'Then glorify' },
        { ayatNo: 3, ayatId: 3, surahNo: 3, surahId: id_of_surah_3, wordNo: 2, arabicWord: 'بِحَمْدِ', englishTranslation: 'with (the) praises' },
        { ayatNo: 3, ayatId: 3, surahNo: 3, surahId: id_of_surah_3, wordNo: 3, arabicWord: 'رَبِّكَ', englishTranslation: '(of) your Lord' },
        { ayatNo: 3, ayatId: 3, surahNo: 3, surahId: id_of_surah_3, wordNo: 4, arabicWord: 'وَاسْتَغْفِرْهُ', englishTranslation: 'and ask His forgiveness' },
        { ayatNo: 3, ayatId: 3, surahNo: 3, surahId: id_of_surah_3, wordNo: 5, arabicWord: 'اِنَّهٗ', englishTranslation: 'Indeed He' },
        { ayatNo: 3, ayatId: 3, surahNo: 3, surahId: id_of_surah_3, wordNo: 6, arabicWord: 'كَانَ', englishTranslation: 'is' },
        { ayatNo: 3, ayatId: 3, surahNo: 3, surahId: id_of_surah_3, wordNo: 7, arabicWord: 'تَوَّابًا', englishTranslation: 'Oft-Returning' }
       
        // surah 4
        // Verse 1
        ,{ ayatNo: 1, ayatId: 1, surahNo: 4, surahId: id_of_surah_4, wordNo: 1, arabicWord: 'لِإِيلَٰفِ', englishTranslation: 'For (the) familiarity' },
        { ayatNo: 1, ayatId: 1, surahNo: 4, surahId: id_of_surah_4, wordNo: 2, arabicWord: 'قُرَيْشٍ', englishTranslation: '(of the) Quraish' },
        // Verse 2
        { ayatNo: 2, ayatId: 2, surahNo: 4, surahId: id_of_surah_4, wordNo: 1, arabicWord: 'إِۦلَٰفِهِمْ', englishTranslation: 'Their familiarity' },
        { ayatNo: 2, ayatId: 2, surahNo: 4, surahId: id_of_surah_4, wordNo: 2, arabicWord: 'رِحْلَةَ', englishTranslation: '(with the) journey' },
        { ayatNo: 2, ayatId: 2, surahNo: 4, surahId: id_of_surah_4, wordNo: 3, arabicWord: 'ٱلشِّتَاۤءِ', englishTranslation: 'of winter' },
        { ayatNo: 2, ayatId: 2, surahNo: 4, surahId: id_of_surah_4, wordNo: 4, arabicWord: 'وَٱلصَّيْفِ', englishTranslation: 'and summer' },
        // Verse 3
        { ayatNo: 3, ayatId: 3, surahNo: 4, surahId: id_of_surah_4, wordNo: 1, arabicWord: 'فَلْيَعْبُدُوا۟', englishTranslation: 'So let them worship' },
        { ayatNo: 3, ayatId: 3, surahNo: 4, surahId: id_of_surah_4, wordNo: 2, arabicWord: 'رَبَّ', englishTranslation: '(the) Lord' },
        { ayatNo: 3, ayatId: 3, surahNo: 4, surahId: id_of_surah_4, wordNo: 3, arabicWord: 'هَٰذَا', englishTranslation: '(of) this' },
        { ayatNo: 3, ayatId: 3, surahNo: 4, surahId: id_of_surah_4, wordNo: 4, arabicWord: 'ٱلْبَيْتِ', englishTranslation: 'House' },
        // Verse 4
        { ayatNo: 4, ayatId: 4, surahNo: 4, surahId: id_of_surah_4, wordNo: 1, arabicWord: 'ٱلَّذِىٓ', englishTranslation: 'The One Who' },
        { ayatNo: 4, ayatId: 4, surahNo: 4, surahId: id_of_surah_4, wordNo: 2, arabicWord: 'أَطْعَمَهُم', englishTranslation: 'feeds them' },
        { ayatNo: 4, ayatId: 4, surahNo: 4, surahId: id_of_surah_4, wordNo: 3, arabicWord: 'مِّن', englishTranslation: 'against' },
        { ayatNo: 4, ayatId: 4, surahNo: 4, surahId: id_of_surah_4, wordNo: 4, arabicWord: 'جُوعٍ', englishTranslation: 'hunger' },
        { ayatNo: 4, ayatId: 4, surahNo: 4, surahId: id_of_surah_4, wordNo: 5, arabicWord: 'وَّءَامَنَهُم', englishTranslation: 'and gives them security' },
        { ayatNo: 4, ayatId: 4, surahNo: 4, surahId: id_of_surah_4, wordNo: 6, arabicWord: 'مِّن', englishTranslation: 'against' },
        { ayatNo: 4, ayatId: 4, surahNo: 4, surahId: id_of_surah_4, wordNo: 7, arabicWord: 'خَوْفٍۭ', englishTranslation: 'fear' },

        //surah 5
        // Verse 1
        { ayatNo: 1, ayatId: 1, surahNo: 5, surahId: id_of_surah_5, wordNo: 1, arabicWord: 'ٱلْحَمْدُ', englishTranslation: 'The praise' },
        { ayatNo: 1, ayatId: 1, surahNo: 5, surahId: id_of_surah_5, wordNo: 2, arabicWord: 'لِلَّهِ', englishTranslation: 'of Allah,' },
        { ayatNo: 1, ayatId: 1, surahNo: 5, surahId: id_of_surah_5, wordNo: 3, arabicWord: 'رَبِّ', englishTranslation: 'the Lord' },
        { ayatNo: 1, ayatId: 1, surahNo: 5, surahId: id_of_surah_5, wordNo: 4, arabicWord: 'ٱلْعَٰلَمِينَ', englishTranslation: 'of the worlds.' },
        // Verse 2
        { ayatNo: 2, ayatId: 2, surahNo: 5, surahId: id_of_surah_5, wordNo: 1, arabicWord: 'ٱلرَّحْمَٰنِ', englishTranslation: 'The Most Merciful,' },
        { ayatNo: 2, ayatId: 2, surahNo: 5, surahId: id_of_surah_5, wordNo: 2, arabicWord: 'ٱلرَّحِيمِ', englishTranslation: 'The Most Merciful.' },
        // Verse 3
        { ayatNo: 3, ayatId: 3, surahNo: 5, surahId: id_of_surah_5, wordNo: 1, arabicWord: 'مَـٰلِكِ', englishTranslation: 'The Owner' },
        { ayatNo: 3, ayatId: 3, surahNo: 5, surahId: id_of_surah_5, wordNo: 2, arabicWord: 'يَوْمِ', englishTranslation: 'of the Day' },
        { ayatNo: 3, ayatId: 3, surahNo: 5, surahId: id_of_surah_5, wordNo: 3, arabicWord: 'ٱلدِّينِ', englishTranslation: 'of Judgment.' },
        // Verse 4
        { ayatNo: 4, ayatId: 4, surahNo: 5, surahId: id_of_surah_5, wordNo: 1, arabicWord: 'إِيَّاكَ', englishTranslation: 'You alone' },
        { ayatNo: 4, ayatId: 4, surahNo: 5, surahId: id_of_surah_5, wordNo: 2, arabicWord: 'نَعْبُدُ', englishTranslation: 'we worship,' },
        { ayatNo: 4, ayatId: 4, surahNo: 5, surahId: id_of_surah_5, wordNo: 3, arabicWord: 'وَإِيَّاكَ', englishTranslation: 'and You alone' },
        { ayatNo: 4, ayatId: 4, surahNo: 5, surahId: id_of_surah_5, wordNo: 4, arabicWord: 'نَسْتَعِينُ', englishTranslation: 'we ask for help.' },
        // Verse 5
        { ayatNo: 5, ayatId: 5, surahNo: 5, surahId: id_of_surah_5, wordNo: 1, arabicWord: 'ٱهْدِنَا', englishTranslation: 'Guide us' },
        { ayatNo: 5, ayatId: 5, surahNo: 5, surahId: id_of_surah_5, wordNo: 2, arabicWord: 'ٱلصِّرَٰطَ', englishTranslation: 'to the Straight Path,' },
        { ayatNo: 5, ayatId: 5, surahNo: 5, surahId: id_of_surah_5, wordNo: 3, arabicWord: 'ٱلْمُسْتَقِيمَ', englishTranslation: 'the Straight.' },
        // Verse 6
        { ayatNo: 6, ayatId: 6, surahNo: 5, surahId: id_of_surah_5, wordNo: 1, arabicWord: 'صِرَٰطَ', englishTranslation: 'The path' },
        { ayatNo: 6, ayatId: 6, surahNo: 5, surahId: id_of_surah_5, wordNo: 2, arabicWord: 'ٱلَّذِينَ', englishTranslation: 'of those' },
        { ayatNo: 6, ayatId: 6, surahNo: 5, surahId: id_of_surah_5, wordNo: 3, arabicWord: 'أَنْعَمْتَ', englishTranslation: 'You have bestowed favor upon' },
        { ayatNo: 6, ayatId: 6, surahNo: 5, surahId: id_of_surah_5, wordNo: 4, arabicWord: 'عَلَيْهِمْ', englishTranslation: '— not' },
        { ayatNo: 6, ayatId: 6, surahNo: 5, surahId: id_of_surah_5, wordNo: 5, arabicWord: 'غَيْرِ', englishTranslation: 'of those' },
        { ayatNo: 6, ayatId: 6, surahNo: 5, surahId: id_of_surah_5, wordNo: 6, arabicWord: 'ٱلْمَغْضُوبِ', englishTranslation: 'who have evoked [Your] anger' },
        { ayatNo: 6, ayatId: 6, surahNo: 5, surahId: id_of_surah_5, wordNo: 7, arabicWord: 'عَلَيْهِمْ', englishTranslation: 'nor' },
        { ayatNo: 6, ayatId: 6, surahNo: 5, surahId: id_of_surah_5, wordNo: 8, arabicWord: 'وَلَا', englishTranslation: 'those who' },
        { ayatNo: 6, ayatId: 6, surahNo: 5, surahId: id_of_surah_5, wordNo: 9, arabicWord: 'ٱلضَّآلِّينَ', englishTranslation: 'have gone astray.' },

        // Surah Qadar (97)
        // Ayah 1
        { ayatNo: 1, ayatId: 1, surahNo: 6, surahId: id_of_surah_6 , wordNo: 1, arabicWord: 'إِنَّا', englishTranslation: 'Indeed,' },
        { ayatNo: 1, ayatId: 1, surahNo: 6, surahId: id_of_surah_6, wordNo: 2, arabicWord: 'أَنزَلْنَاهُ', englishTranslation: 'We sent it down' },
        { ayatNo: 1, ayatId: 1, surahNo: 6, surahId: id_of_surah_6, wordNo: 3, arabicWord: 'فِي', englishTranslation: 'in' },
        { ayatNo: 1, ayatId: 1, surahNo: 6, surahId: id_of_surah_6, wordNo: 4, arabicWord: 'لَيْلَةِ', englishTranslation: 'the Night' },
        { ayatNo: 1, ayatId: 1, surahNo: 6, surahId: id_of_surah_6, wordNo: 5, arabicWord: 'ٱلْقَدْرِ', englishTranslation: 'of Decree.' },
        // Ayah 2
        { ayatNo: 2, ayatId: 2, surahNo: 6, surahId: id_of_surah_6, wordNo: 1, arabicWord: 'وَمَا', englishTranslation: 'And what' },
        { ayatNo: 2, ayatId: 2, surahNo: 6, surahId: id_of_surah_6, wordNo: 2, arabicWord: 'أَدْرَاكَ', englishTranslation: 'can make you know' },
        { ayatNo: 2, ayatId: 2, surahNo: 6, surahId: id_of_surah_6, wordNo: 3, arabicWord: 'مَا', englishTranslation: 'what' },
        { ayatNo: 2, ayatId: 2, surahNo: 6, surahId: id_of_surah_6, wordNo: 4, arabicWord: 'لَيْلَةُ', englishTranslation: 'the Night' },
        { ayatNo: 2, ayatId: 2, surahNo: 6, surahId: id_of_surah_6, wordNo: 5, arabicWord: 'ٱلْقَدْرِ', englishTranslation: 'of Decree' },
        // Ayah 3
        { ayatNo: 3, ayatId: 3, surahNo: 6, surahId: id_of_surah_6, wordNo: 1, arabicWord: 'لَيْلَةُ', englishTranslation: 'The Night' },
        { ayatNo: 3, ayatId: 3, surahNo: 6, surahId: id_of_surah_6, wordNo: 2, arabicWord: 'ٱلْقَدْرِ', englishTranslation: 'of Decree' },
        { ayatNo: 3, ayatId: 3, surahNo: 6, surahId: id_of_surah_6, wordNo: 3, arabicWord: 'خَيْرٌ', englishTranslation: 'is better' },
        { ayatNo: 3, ayatId: 3, surahNo: 6, surahId: id_of_surah_6, wordNo: 4, arabicWord: 'مِّنْ', englishTranslation: 'than' },
        { ayatNo: 3, ayatId: 3, surahNo: 6, surahId: id_of_surah_6, wordNo: 5, arabicWord: 'أَلْفِ', englishTranslation: 'a thousand' },
        { ayatNo: 3, ayatId: 3, surahNo: 6, surahId: id_of_surah_6, wordNo: 6, arabicWord: 'شَهْرٍ', englishTranslation: 'months.' },
        { ayatNo: 4, ayatId: 4, surahNo: 6, surahId: id_of_surah_6, wordNo: 1, arabicWord: 'تَنَزَّلُ', englishTranslation: 'The angels and the Spirit descend' },
        { ayatNo: 4, ayatId: 4, surahNo: 6, surahId: id_of_surah_6, wordNo: 2, arabicWord: 'ٱلْمَلَائِكَةُ', englishTranslation: 'the angels' },
        { ayatNo: 4, ayatId: 4, surahNo: 6, surahId: id_of_surah_6, wordNo: 3, arabicWord: 'وَٱلرُّوحُ', englishTranslation: 'and the Spirit' },
        { ayatNo: 4, ayatId: 4, surahNo: 6, surahId: id_of_surah_6, wordNo: 4, arabicWord: 'فِيهَا', englishTranslation: 'in it' },
        { ayatNo: 4, ayatId: 4, surahNo: 6, surahId: id_of_surah_6, wordNo: 5, arabicWord: 'بِإِذْنِ', englishTranslation: 'by permission' },
        { ayatNo: 4, ayatId: 4, surahNo: 6, surahId: id_of_surah_6, wordNo: 6, arabicWord: 'رَبِّهِم مِّن', englishTranslation: 'of their Lord' },
        { ayatNo: 4, ayatId: 4, surahNo: 6, surahId: id_of_surah_6, wordNo: 7, arabicWord: 'كُلِّ', englishTranslation: 'for every' },
        { ayatNo: 4, ayatId: 4, surahNo: 6, surahId: id_of_surah_6, wordNo: 8, arabicWord: 'أَمْرٍ', englishTranslation: 'affair.' },
        // Ayah 5
        { ayatNo: 5, ayatId: 5, surahNo: 6, surahId: id_of_surah_6, wordNo: 1, arabicWord: 'سَلَامٌ', englishTranslation: 'Peace' },
        { ayatNo: 5, ayatId: 5, surahNo: 6, surahId: id_of_surah_6, wordNo: 2, arabicWord: 'هِيَ', englishTranslation: 'it is' },
        { ayatNo: 5, ayatId: 5, surahNo: 6, surahId: id_of_surah_6, wordNo: 3, arabicWord: 'حَتَّىٰ', englishTranslation: 'until' },
        { ayatNo: 5, ayatId: 5, surahNo: 6, surahId: id_of_surah_6, wordNo: 4, arabicWord: 'مَطْلَعِ', englishTranslation: 'the emergence' },
        { ayatNo: 5, ayatId: 5, surahNo: 6, surahId: id_of_surah_6, wordNo: 5, arabicWord: 'ٱلْفَجْرِ', englishTranslation: 'of dawn.' }
    
        //Surah Falaq (113)
        // Ayah 1
        ,{ ayatNo: 1, ayatId: 1, surahNo: 7, surahId: id_of_surah_7, wordNo: 1, arabicWord: 'قُلْ', englishTranslation: 'Say,' },
        { ayatNo: 1, ayatId: 1, surahNo: 7, surahId: id_of_surah_7, wordNo: 2, arabicWord: 'أَعُوذُ', englishTranslation: 'I seek refuge' },
        { ayatNo: 1, ayatId: 1, surahNo: 7, surahId: id_of_surah_7, wordNo: 3, arabicWord: 'بِرَبِّ', englishTranslation: 'in the Lord' },
        { ayatNo: 1, ayatId: 1, surahNo: 7, surahId: id_of_surah_7, wordNo: 4, arabicWord: 'ٱلْفَلَقِ', englishTranslation: 'of daybreak,' },
        // Ayah 2
        { ayatNo: 2, ayatId: 2, surahNo: 7, surahId: id_of_surah_7, wordNo: 1, arabicWord: 'مِن شَرِّ', englishTranslation: 'from the evil' },
        { ayatNo: 2, ayatId: 2, surahNo: 7, surahId: id_of_surah_7, wordNo: 2, arabicWord: 'مَا', englishTranslation: 'of what' },
        { ayatNo: 2, ayatId: 2, surahNo: 7, surahId: id_of_surah_7, wordNo: 3, arabicWord: 'خَلَقَ', englishTranslation: 'He created' },
        { ayatNo: 2, ayatId: 2, surahNo: 7, surahId: id_of_surah_7, wordNo: 4, arabicWord: 'وَمِن شَرِّ', englishTranslation: 'and from the evil' },
        { ayatNo: 2, ayatId: 2, surahNo: 7, surahId: id_of_surah_7, wordNo: 5, arabicWord: 'غَاسِقٍ', englishTranslation: 'of darkness' },
        { ayatNo: 2, ayatId: 2, surahNo: 7, surahId: id_of_surah_7, wordNo: 6, arabicWord: 'إِذَا', englishTranslation: 'when' },
        { ayatNo: 2, ayatId: 2, surahNo: 7, surahId: id_of_surah_7, wordNo: 7, arabicWord: 'وَقَبَ', englishTranslation: 'it spreads in the horizon,' },
        // Ayah 3
        { ayatNo: 3, ayatId: 3, surahNo: 7, surahId: id_of_surah_7, wordNo: 1, arabicWord: 'وَمِن شَرِّ', englishTranslation: 'and from the evil' },
        { ayatNo: 3, ayatId: 3, surahNo: 7, surahId: id_of_surah_7, wordNo: 2, arabicWord: 'ٱلنَّفَّـٰثَـٰتِ', englishTranslation: 'of those who blow on knots,' },
        { ayatNo: 3, ayatId: 3, surahNo: 7, surahId: id_of_surah_7, wordNo: 3, arabicWord: 'فِى', englishTranslation: 'and' },
        { ayatNo: 3, ayatId: 3, surahNo: 7, surahId: id_of_surah_7, wordNo: 4, arabicWord: 'ٱلْعُقَدِ', englishTranslation: 'the knots' },
        //Ayah 4
        { ayatNo: 4, ayatId: 5, surahNo: 7, surahId: id_of_surah_7, wordNo: 1, arabicWord: 'وَمِنْ', englishTranslation: 'And from' },
        { ayatNo: 4, ayatId: 5, surahNo: 7, surahId: id_of_surah_7, wordNo: 2, arabicWord: 'شَرِّ', englishTranslation: '(the) evil' },
        { ayatNo: 4, ayatId: 5, surahNo: 7, surahId: id_of_surah_7, wordNo: 3, arabicWord: 'حَاسِدٍ', englishTranslation: '(of) an envier' },
        { ayatNo: 4, ayatId: 5, surahNo: 7, surahId: id_of_surah_7, wordNo: 4, arabicWord: 'إِذَا', englishTranslation: 'when' },
        { ayatNo: 4, ayatId: 5, surahNo: 7, surahId: id_of_surah_7, wordNo: 5, arabicWord: 'حَسَدَ', englishTranslation: 'he envies' }
    
        //Surah Al-Feel (105)
        // Ayah 1
        ,{ ayatNo: 1, ayatId: 1, surahNo: 8, surahId: id_of_surah_8, wordNo: 1, arabicWord: 'أَلَمْ', englishTranslation: 'Did' },
        { ayatNo: 1, ayatId: 1, surahNo: 8, surahId: id_of_surah_8, wordNo: 2, arabicWord: 'تَرَ', englishTranslation: 'you (not) see' },
        { ayatNo: 1, ayatId: 1, surahNo: 8, surahId: id_of_surah_8, wordNo: 3, arabicWord: 'كَيْفَ', englishTranslation: 'how' },
        { ayatNo: 1, ayatId: 1, surahNo: 8, surahId: id_of_surah_8, wordNo: 4, arabicWord: 'فَعَلَ', englishTranslation: 'He did' },
        { ayatNo: 1, ayatId: 1, surahNo: 8, surahId: id_of_surah_8, wordNo: 5, arabicWord: 'رَبُّكَ', englishTranslation: 'your Lord' },
        { ayatNo: 1, ayatId: 1, surahNo: 8, surahId: id_of_surah_8, wordNo: 6, arabicWord: 'بِأَصْحَابِ', englishTranslation: 'with the companions' },
        { ayatNo: 1, ayatId: 1, surahNo: 8, surahId: id_of_surah_8, wordNo: 7, arabicWord: 'ٱلْفِيلِ', englishTranslation: 'of the elephant?' },
        // Ayah 2
        { ayatNo: 2, ayatId: 2, surahNo: 8, surahId: id_of_surah_8, wordNo: 1, arabicWord: 'أَلَمْ', englishTranslation: 'Did' },
        { ayatNo: 2, ayatId: 2, surahNo: 8, surahId: id_of_surah_8, wordNo: 2, arabicWord: 'يَجْعَلْ', englishTranslation: 'He make' },
        { ayatNo: 2, ayatId: 2, surahNo: 8, surahId: id_of_surah_8, wordNo: 3, arabicWord: 'كَيْدَهُمْ', englishTranslation: 'their plot' },
        { ayatNo: 2, ayatId: 2, surahNo: 8, surahId: id_of_surah_8, wordNo: 4, arabicWord: 'فِى', englishTranslation: 'in' },
        { ayatNo: 2, ayatId: 2, surahNo: 8, surahId: id_of_surah_8, wordNo: 5, arabicWord: 'تَضْلِيلٍ', englishTranslation: 'in confusion?' },
        // Ayah 3
        { ayatNo: 3, ayatId: 3, surahNo: 8, surahId:id_of_surah_8,wordNo: 1, arabicWord: 'وَأَرْسَلَ', englishTranslation: 'And He sent' },
        { ayatNo: 3, ayatId: 3, surahNo: 8, surahId: id_of_surah_8, wordNo: 2, arabicWord: 'عَلَيْهِمْ', englishTranslation: 'against them' },
        { ayatNo: 3, ayatId: 3, surahNo: 8, surahId: id_of_surah_8, wordNo: 3, arabicWord: 'طَيْرًا', englishTranslation: 'birds' },
        { ayatNo: 3, ayatId: 3, surahNo: 8, surahId: id_of_surah_8, wordNo: 4, arabicWord: 'أَبَابِيلَ', englishTranslation: 'in flocks,' },
        { ayatNo: 3, ayatId: 3, surahNo: 8, surahId: id_of_surah_8, wordNo: 5, arabicWord: 'تَرْمِيهِم بِحِجَارَةٍ مِّن', englishTranslation: 'striking them with stones of' },
        { ayatNo: 3, ayatId: 3, surahNo: 8, surahId: id_of_surah_8, wordNo: 6, arabicWord: 'سِجِّيلٍ', englishTranslation: 'baked clay.' },
        // Ayah 4
        { ayatNo: 4, ayatId: 4, surahNo: 8, surahId: id_of_surah_8, wordNo: 1, arabicWord: 'فَجَعَلَهُمْ', englishTranslation: 'And made them' },
        { ayatNo: 4, ayatId: 4, surahNo: 8, surahId: id_of_surah_8, wordNo: 2, arabicWord: 'كَعَصْفٍۢ مَّأْكُولٍ', englishTranslation: 'like eaten straw.' }
        //Surah Al-Massad (111)       
        // Ayah 1
        ,{ ayatNo: 1, ayatId: 1, surahNo: 9, surahId: id_of_surah_9, wordNo: 1, arabicWord: 'تَبَّتْ', englishTranslation: 'Perish' },
        { ayatNo: 1, ayatId: 1, surahNo: 9, surahId: id_of_surah_9, wordNo: 2, arabicWord: 'يَدَآ', englishTranslation: '(the) hands' },
        { ayatNo: 1, ayatId: 1, surahNo: 9, surahId: id_of_surah_9, wordNo: 3, arabicWord: 'اَبِيْ', englishTranslation: 'of Abu' },
        { ayatNo: 1, ayatId: 1, surahNo: 9, surahId: id_of_surah_9, wordNo: 4, arabicWord: 'لَهَبٍ', englishTranslation: 'Lahab' },
        { ayatNo: 1, ayatId: 1, surahNo: 9, surahId: id_of_surah_9, wordNo: 5, arabicWord: 'وَّتَبَّ', englishTranslation: 'and perish he' },
        // Ayah 2
        { ayatNo: 2, ayatId: 2, surahNo: 9, surahId: id_of_surah_9, wordNo: 1, arabicWord: 'مَآ', englishTranslation: 'Not' },
        { ayatNo: 2, ayatId: 2, surahNo: 9, surahId: id_of_surah_9, wordNo: 2, arabicWord: 'اغْنٰى', englishTranslation: '(will) avail' },
        { ayatNo: 2, ayatId: 2, surahNo: 9, surahId: id_of_surah_9, wordNo: 3, arabicWord: 'عَنْهُ', englishTranslation: 'him' },
        { ayatNo: 2, ayatId: 2, surahNo: 9, surahId: id_of_surah_9, wordNo: 4, arabicWord: 'مَالُهٗ', englishTranslation: 'his wealth' },
        { ayatNo: 2, ayatId: 2, surahNo: 9, surahId: id_of_surah_9, wordNo: 5, arabicWord: 'وَمَا', englishTranslation: 'and what' },
        { ayatNo: 2, ayatId: 2, surahNo: 9, surahId: id_of_surah_9, wordNo: 6, arabicWord: 'كَسَبَ', englishTranslation: 'he earned' },
        // Ayah 3
        { ayatNo: 3, ayatId: 3, surahNo: 9, surahId: id_of_surah_9, wordNo: 1, arabicWord: 'سَيَصْلٰى', englishTranslation: 'He will be burnt' },
        { ayatNo: 3, ayatId: 3, surahNo: 9, surahId: id_of_surah_9, wordNo: 2, arabicWord: 'نَارًا', englishTranslation: '(in) a Fire' },
        { ayatNo: 3, ayatId: 3, surahNo: 9, surahId: id_of_surah_9, wordNo: 3, arabicWord: 'ذَاتَ', englishTranslation: 'of' },
        { ayatNo: 3, ayatId: 3, surahNo: 9, surahId: id_of_surah_9, wordNo: 4, arabicWord: 'لَهَبٍ', englishTranslation: 'Blazing Flames,' },
        // Ayah 4
        { ayatNo: 4, ayatId: 4, surahNo: 9, surahId: id_of_surah_9, wordNo: 1, arabicWord: 'وَّامْرَاَتُهٗ', englishTranslation: 'And his wife' },
        { ayatNo: 4, ayatId: 4, surahNo: 9, surahId: id_of_surah_9, wordNo: 2, arabicWord: 'حَمَّالَةَ', englishTranslation: '(the) carrier' },
        { ayatNo: 4, ayatId: 4, surahNo: 9, surahId: id_of_surah_9, wordNo: 3, arabicWord: 'الْحَطَبِ', englishTranslation: 'of firewood' },
        // Ayah 5
        { ayatNo: 5, ayatId: 5, surahNo: 9, surahId: id_of_surah_9, wordNo: 1, arabicWord: 'فِيْ', englishTranslation: 'Around' },
        { ayatNo: 5, ayatId: 5, surahNo: 9, surahId: id_of_surah_9, wordNo: 2, arabicWord: 'جِيْدِهَا', englishTranslation: 'her neck' },
        { ayatNo: 5, ayatId: 5, surahNo: 9, surahId: id_of_surah_9, wordNo: 3, arabicWord: 'حَبْلٌ', englishTranslation: '(will be) a rope' },
        { ayatNo: 5, ayatId: 5, surahNo: 9, surahId: id_of_surah_9, wordNo: 4, arabicWord: 'مِّنْ', englishTranslation: 'of' },
        { ayatNo: 5, ayatId: 5, surahNo: 9, surahId: id_of_surah_9, wordNo: 5, arabicWord: 'مَّسَدٍ', englishTranslation: 'palm-fiber' }

        //surah 10
        // Verse 1
        ,{ ayatNo: 1, ayatId: 1, surahNo: 10, surahId: id_of_surah_10, wordNo: 1, arabicWord: 'قُلْ', englishTranslation: 'Say:' },
        { ayatNo: 1, ayatId: 1, surahNo: 10, surahId: id_of_surah_10, wordNo: 2, arabicWord: 'هُوَ', englishTranslation: 'He is' },
        { ayatNo: 1, ayatId: 1, surahNo: 10, surahId: id_of_surah_10, wordNo: 3, arabicWord: 'ٱللَّهُ', englishTranslation: 'Allah,' },
        { ayatNo: 1, ayatId: 1, surahNo: 10, surahId: id_of_surah_10, wordNo: 4, arabicWord: 'أَحَدٌ', englishTranslation: 'the One' },
        // Verse 2
        { ayatNo: 2, ayatId: 2, surahNo: 10, surahId: id_of_surah_10, wordNo: 1, arabicWord: 'ٱللَّهُ', englishTranslation: 'Allah' },
        { ayatNo: 2, ayatId: 2, surahNo: 10, surahId: id_of_surah_10, wordNo: 2, arabicWord: 'ٱلصَّمَدُ', englishTranslation: 'the Eternal, the Absolute' },
        // Verse 3
        { ayatNo: 3, ayatId: 3, surahNo: 10, surahId: id_of_surah_10, wordNo: 1, arabicWord: 'لَمْ', englishTranslation: 'He neither' },
        { ayatNo: 3, ayatId: 3, surahNo: 10, surahId: id_of_surah_10, wordNo: 2, arabicWord: 'يَلِدْ', englishTranslation: 'begets' },
        { ayatNo: 3, ayatId: 3, surahNo: 10, surahId: id_of_surah_10, wordNo: 3, arabicWord: 'وَلَمْ', englishTranslation: 'nor' },
        { ayatNo: 3, ayatId: 3, surahNo: 10, surahId: id_of_surah_10, wordNo: 4, arabicWord: 'يُولَدْ', englishTranslation: 'is begotten' },
        // Verse 4
        { ayatNo: 4, ayatId: 4, surahNo: 10, surahId: id_of_surah_10, wordNo: 1, arabicWord: 'وَلَمْ', englishTranslation: 'And not' },
        { ayatNo: 4, ayatId: 4, surahNo: 10, surahId: id_of_surah_10, wordNo: 2, arabicWord: 'يَكُنْ', englishTranslation: 'is' },
        { ayatNo: 4, ayatId: 4, surahNo: 10, surahId: id_of_surah_10, wordNo: 3, arabicWord: 'لَّهُۥ', englishTranslation: 'for Him' },
        { ayatNo: 4, ayatId: 4, surahNo: 10, surahId: id_of_surah_10, wordNo: 4, arabicWord: 'كُفُوًا', englishTranslation: 'equivalent' },
        { ayatNo: 4, ayatId: 4, surahNo: 10, surahId: id_of_surah_10, wordNo: 5, arabicWord: 'أَحَدٌۢ', englishTranslation: 'any [one]"' }

        //11
        // Verse 1
        ,{ ayatNo: 1, ayatId: 1, surahNo: 11, surahId: id_of_surah_11, wordNo: 1, arabicWord: 'قُلْ', englishTranslation: 'Say:' },
        { ayatNo: 1, ayatId: 1, surahNo: 11, surahId: id_of_surah_11, wordNo: 2, arabicWord: 'يٰٓأَيُّهَا', englishTranslation: 'O' },
        { ayatNo: 1, ayatId: 1, surahNo: 11, surahId: id_of_surah_11, wordNo: 3, arabicWord: 'ٱلْكَٰفِرُونَ', englishTranslation: 'disbelievers!' },
        // Verse 2
        { ayatNo: 2, ayatId: 2, surahNo: 11, surahId: id_of_surah_11, wordNo: 1, arabicWord: 'لَآ', englishTranslation: 'Not' },
        { ayatNo: 2, ayatId: 2, surahNo: 11, surahId: id_of_surah_11, wordNo: 2, arabicWord: 'أَعْبُدُ', englishTranslation: 'I worship' },
        { ayatNo: 2, ayatId: 2, surahNo: 11, surahId: id_of_surah_11, wordNo: 3, arabicWord: 'مَا', englishTranslation: 'what' },
        { ayatNo: 2, ayatId: 2, surahNo: 11, surahId: id_of_surah_11, wordNo: 4, arabicWord: 'تَعْبُدُونَ', englishTranslation: 'you worship' },
        // Verse 3
        { ayatNo: 3, ayatId: 3, surahNo: 11, surahId: id_of_surah_11, wordNo: 1, arabicWord: 'وَلَآ', englishTranslation: 'And not' },
        { ayatNo: 3, ayatId: 3, surahNo: 11, surahId: id_of_surah_11, wordNo: 2, arabicWord: 'أَنْتُمْ', englishTranslation: 'you' },
        { ayatNo: 3, ayatId: 3, surahNo: 11, surahId: id_of_surah_11, wordNo: 3, arabicWord: 'عَٰبِدُونَ', englishTranslation: 'worshippers' },
        { ayatNo: 3, ayatId: 3, surahNo: 11, surahId: id_of_surah_11, wordNo: 4, arabicWord: 'مَآ', englishTranslation: '(are) what' },
        { ayatNo: 3, ayatId: 3, surahNo: 11, surahId: id_of_surah_11, wordNo: 5, arabicWord: 'أَعْبُدُ', englishTranslation: 'I worship' },
        // Verse 4
        { ayatNo: 4, ayatId: 4, surahNo: 11, surahId: id_of_surah_11, wordNo: 1, arabicWord: 'وَلَآ', englishTranslation: 'And not' },
        { ayatNo: 4, ayatId: 4, surahNo: 11, surahId: id_of_surah_11, wordNo: 2, arabicWord: 'أَنَا۠', englishTranslation: 'I am' },
        { ayatNo: 4, ayatId: 4, surahNo: 11, surahId: id_of_surah_11, wordNo: 3, arabicWord: 'عَابِدٌ', englishTranslation: 'a worshipper' },
        { ayatNo: 4, ayatId: 4, surahNo: 11, surahId: id_of_surah_11, wordNo: 4, arabicWord: 'مَّا', englishTranslation: '(of) what' },
        { ayatNo: 4, ayatId: 4, surahNo: 11, surahId: id_of_surah_11, wordNo: 5, arabicWord: 'عَبَدْتُّمْ', englishTranslation: 'you worship' },
        // Verse 5
        { ayatNo: 5, ayatId: 5, surahNo: 11, surahId: id_of_surah_11, wordNo: 1, arabicWord: 'وَلَآ', englishTranslation: 'And not' },
        { ayatNo: 5, ayatId: 5, surahNo: 11, surahId: id_of_surah_11, wordNo: 2, arabicWord: 'أَنتُمْ', englishTranslation: 'you are' },
        { ayatNo: 5, ayatId: 5, surahNo: 11, surahId: id_of_surah_11, wordNo: 3, arabicWord: 'عَٰبِدُونَ', englishTranslation: 'worshippers' },
        { ayatNo: 5, ayatId: 5, surahNo: 11, surahId: id_of_surah_11, wordNo: 4, arabicWord: 'مَآ', englishTranslation: '(of) what' },
        { ayatNo: 5, ayatId: 5, surahNo: 11, surahId: id_of_surah_11, wordNo: 5, arabicWord: 'أَعْبُدُ', englishTranslation: 'I worship' },
        // Verse 6
        { ayatNo: 6, ayatId: 6, surahNo: 11, surahId: id_of_surah_11, wordNo: 1, arabicWord: 'لَكُمْ', englishTranslation: 'For you' },
        { ayatNo: 6, ayatId: 6, surahNo: 11, surahId: id_of_surah_11, wordNo: 2, arabicWord: 'دِيْنُكُمْ', englishTranslation: 'is your religion' },
        { ayatNo: 6, ayatId: 6, surahNo: 11, surahId: id_of_surah_11, wordNo: 3, arabicWord: 'وَلِىَ', englishTranslation: 'and for me' },
        { ayatNo: 6, ayatId: 6, surahNo: 11, surahId: id_of_surah_11, wordNo: 4, arabicWord: 'دِيْنِ', englishTranslation: 'is my religion' }

        //12
        // Verse 1
        ,{ ayatNo: 1, ayatId: 1, surahNo: 12, surahId: id_of_surah_12, wordNo: 1, arabicWord: 'قُلْ', englishTranslation: 'Say' },
        { ayatNo: 1, ayatId: 1, surahNo: 12, surahId: id_of_surah_12, wordNo: 2, arabicWord: 'أَعُوذُ', englishTranslation: 'I seek refuge' },
        { ayatNo: 1, ayatId: 1, surahNo: 12, surahId: id_of_surah_12, wordNo: 3, arabicWord: 'بِرَبِّ', englishTranslation: 'in (the) Lord' },
        { ayatNo: 1, ayatId: 1, surahNo: 12, surahId: id_of_surah_12, wordNo: 4, arabicWord: 'ٱلنَّاسِ', englishTranslation: 'of mankind' },
        // Verse 2
        { ayatNo: 2, ayatId: 2, surahNo: 12, surahId: id_of_surah_12, wordNo: 1, arabicWord: 'مَلِكِ', englishTranslation: '(The) King' },
        { ayatNo: 2, ayatId: 2, surahNo: 12, surahId: id_of_surah_12, wordNo: 2, arabicWord: 'ٱلنَّاسِ', englishTranslation: 'of mankind' },
        // Verse 3
        { ayatNo: 3, ayatId: 3, surahNo: 12, surahId: id_of_surah_12, wordNo: 1, arabicWord: 'إِلَٰهِ', englishTranslation: '(The) God' },
        { ayatNo: 3, ayatId: 3, surahNo: 12, surahId: id_of_surah_12, wordNo: 2, arabicWord: 'ٱلنَّاسِ', englishTranslation: 'of mankind' },
        // Verse 4
        { ayatNo: 4, ayatId: 4, surahNo: 12, surahId: id_of_surah_12, wordNo: 1, arabicWord: 'مِن', englishTranslation: 'From' },
        { ayatNo: 4, ayatId: 4, surahNo: 12, surahId: id_of_surah_12, wordNo: 2, arabicWord: 'شَرِّ', englishTranslation: '(the) evil' },
        { ayatNo: 4, ayatId: 4, surahNo: 12, surahId: id_of_surah_12, wordNo: 3, arabicWord: 'ٱلْوَسْوَاسِ', englishTranslation: '(of) the whisperer' },
        { ayatNo: 4, ayatId: 4, surahNo: 12, surahId: id_of_surah_12, wordNo: 4, arabicWord: 'ٱلْخَنَّاسِ', englishTranslation: 'the one who withdraws' },
        // Verse 5
        { ayatNo: 5, ayatId: 5, surahNo: 12, surahId: id_of_surah_12, wordNo: 1, arabicWord: 'ٱلَّذِى', englishTranslation: 'The one who' },
        { ayatNo: 5, ayatId: 5, surahNo: 12, surahId: id_of_surah_12, wordNo: 2, arabicWord: 'يُوَسْوِسُ', englishTranslation: 'whispers' },
        { ayatNo: 5, ayatId: 5, surahNo: 12, surahId: id_of_surah_12, wordNo: 3, arabicWord: 'فِى', englishTranslation: 'in' },
        { ayatNo: 5, ayatId: 5, surahNo: 12, surahId: id_of_surah_12, wordNo: 4, arabicWord: 'صُدُورِ', englishTranslation: '(the) breasts' },
        { ayatNo: 5, ayatId: 5, surahNo: 12, surahId: id_of_surah_12, wordNo: 5, arabicWord: 'ٱلنَّاسِ', englishTranslation: 'of mankind' },
        // Verse 6
        { ayatNo: 6, ayatId: 6, surahNo: 12, surahId: id_of_surah_12, wordNo: 1, arabicWord: 'مِنَ', englishTranslation: 'From' },
        { ayatNo: 6, ayatId: 6, surahNo: 12, surahId: id_of_surah_12, wordNo: 2, arabicWord: 'ٱلْجِنَّةِ', englishTranslation: 'the jinn' },
        { ayatNo: 6, ayatId: 6, surahNo: 12, surahId: id_of_surah_12, wordNo: 3, arabicWord: 'وَٱلنَّاسِ', englishTranslation: 'and men' }]);
    console.log('Inserted Quranic verses data');

    //DUAS COLLECTION
    await DuasCollection.insertMany([{
        id: 1,
        name: "DUA FOR INCREASE IN KNOWLEDGE",
        arabicText: "رَبِّ زِدْنِي عِلْمًا",
        translation: "My Lord, increase me in knowledge."},
        {
        id: 2,
        name: "ALLAH IS SUFFICIENT",
        arabicText: "حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
        translation: "Sufficient for me is Allah; there is no deity except Him. On Him I have relied, and He is the Lord of the Great Throne."},
        {
        id: 3,
        name: "DUA IN TIMES OF DISTRESS",
        arabicText: "لَا إلَهَ إِلَّا اللَّهُ الْعَظـيمُ الْحَلِـيمْ لَا إِلَهَ إِلَّا اللَّهُ رَبُّ العَـرْشِ العَظِيـمِ لَا إِلَـهَ إِلَّا اللَّهْ رَبُّ السَّمَـوّاتِ ورّبُّ الأَرْضِ ورَبُّ العَرْشِ الكَـريم",
        translation: "There is none worthy of worship but Allah, the Mighty, the Forbearing. There is none worthy of worship but Allah, Lord of the Magnificent Throne. There is none worthy of worship but Allah, Lord of the heavens and Lord of the earth, and Lord of the Noble Throne."},
        {
        id: 4,
        name: "POWERFUL DUA AGAINST SHAYTAN",
        arabicText: "رَبِّ أَعُوذُ بِكَ مِنْ هَمَزَاتِ الشَّيَاطِينِ وَأَعُوذُ بِكَ رَبِّ أَنْ يَحْضُرُونِ",
        translation: "My Lord, I seek refuge in You from the incitements of the devils, And I seek refuge in You, my Lord, lest they be present with me."},
        {
        id: 5,
        name: "IS IT OKAY TO MAKE DUA ASKING FOR WORLDLY THINGS?",
        arabicText: "رَبِّ اغْفِرْ لِي وَهَبْ لِي مُلْكًا لَا يَنْبَغِي لِأَحَدٍ مِنْ بَعْدِي ۖ إِنَّكَ أَنْتَ الْوَهَّابُ",
        translation: "My Lord, forgive me and grant me a kingdom such as will not belong to anyone after me. Indeed, You are the Bestower."},
        {
        id: 6,
        name: "DUA OF PROPHET MUHAMMAD FOR ENTERING A NEW TOWN",
        arabicText: "رَبِّ أَدْخِلْنِي مُدْخَلَ صِدْقٍ وَأَخْرِجْنِي مُخْرَجَ صِدْقٍ وَاجْعَلْ لِي مِنْ لَدُنْكَ سُلْطَانًا نَصِيرًا",
        translation: "My Lord, cause me to enter a sound entrance and to exit a sound exit and grant me from Yourself a supporting authority."},
        {
        id: 7,
        name: "DUA FOR DUNYA AND AKHIRAH",
        arabicText: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
        translation: "Our Lord, give us in this world [that which is] good and in the Hereafter [that which is] good and protect us from the punishment of the Fire."},
        {
        id: 8,
        name: "AMANA RASUL",
        arabicText: "ءَامَنَ ٱلرَّسُولُ بِمَآ أُنزِلَ إِلَيْهِ مِن رَّبِّهِۦ وَٱلْمُؤْمِنُونَ ۚ كُلٌّ ءَامَنَ بِٱللَّهِ وَمَلَـٰٓئِكَتِهِۦ وَكُتُبِهِۦ وَرُسُلِهِۦ لَا نُفَرِّقُ بَيْنَ أَحَدٍۢ مِّن رُّسُلِهِۦ ۚ وَقَالُوا۟ سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ ٱلْمَصِيرُ ٢٨٥-لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا ٱكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَآ إِن نَّسِينَآ أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَآ إِصْرًۭا كَمَا حَمَلْتَهُۥ عَلَى ٱلَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِۦ ۖ وَٱعْفُ عَنَّا وَٱغْفِرْ لَنَا وَٱرْحَمْنَآ ۚ أَنتَ مَوْلَىٰنَا فَٱنصُرْنَا عَلَى ٱلْقَوْمِ ٱلْكَـٰفِرِينَ ٢٨٦",
        translation: "The Messenger [Muhammad (Peace be upon him)] believes in what has been sent down to him from his Lord, and [so do] the believers. Each one believes in Allah, His Angels, His Books, and His Messengers. They say: “We make no distinction between one another of His Messengers” – and they say: “We hear, and we obey. [We seek] Your Forgiveness, our Lord, and to You is the return [of all].-Allah does not charge a soul except [with that within] its capacity. It will have [the consequence of] what [good] it has gained, and it will bear [the consequence of] what [evil] it has earned. “Our Lord, do not impose blame upon us if we have forgotten or erred. Our Lord, and lay not upon us a burden like that which You laid upon those before us. Our Lord, and burden us not with that which we have no ability to bear. And pardon us; and forgive us; and have mercy upon us. You are our protector, so give us victory over the disbelieving people."},
        {
        id: 9,
        name: "IS IT PERMISSIBLE TO MAKE DUA FOR NON-MUSLIMS?",
        arabicText: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِمَنْ دَخَلَ بَيْتِيَ مُؤْمِنًا وَلِلْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ وَلَا تَزِدِ الظَّالِمِينَ إِلَّا تَبَارًا",
        translation: "My Lord, forgive me and my parents and whoever enters my house a believer and the believing men and believing women. And do not increase the wrongdoers except in destruction."},
        {
        id: 10,
        name: "DUA FOR PARENTS FORGIVENESS",
        arabicText: "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
        translation: "My Lord, have mercy upon them as they brought me up [when I was] small."}]);
    // Urdu Translation
    const urdutranslationcollection = db.collection("urdutranslation");
    await urdutranslationcollection.insertMany([
    //surah kawther
    { ayatNo: 1, ayatId: 1, surahNo: 1, surahId: id_of_surah_1, text: "بیشک ہم نے آپ کو (ہر خیر و فضیلت میں) بے انتہا کثرت بخشی ہے" },
    { ayatNo: 2, ayatId: 2, surahNo: 1, surahId: id_of_surah_1, text: "پس آپ اپنے رب کے لئے نماز پڑھا کریں اور قربانی دیا کریں (یہ ہدیۂ تشکرّ ہے)" },
    { ayatNo: 3, ayatId: 3, surahNo: 1, surahId: id_of_surah_1, text: "بیشک آپ کا دشمن ہی بے نسل اور بے نام و نشاں ہوگا" },

    //surah asr
    { ayatNo: 1, ayatId: 1, surahNo: 2, surahId: id_of_surah_2, text: "زمانہ کی قَسم (جس کی گردش انسانی حالات پر گواہ ہے)۔" },
    { ayatNo: 2, ayatId: 2, surahNo: 2, surahId: id_of_surah_2, text: "بیشک انسان خسارے میں ہے (کہ وہ عمرِ عزیز گنوا رہا ہے)،" },
    { ayatNo: 3, ayatId: 3, surahNo: 2, surahId: id_of_surah_2, text: "سوائے ان لوگوں کے جو ایمان لے آئے اور نیک عمل کرتے رہے اور (معاشرے میں) ایک دوسرے کو حق کی تلقین کرتے رہے اور (تبلیغِ حق کے نتیجے میں پیش آمدہ مصائب و آلام میں) باہم صبر کی تاکید کرتے رہے،" },

    //surah nasr
    { ayatNo: 1, ayatId: 1, surahNo: 3, surahId: id_of_surah_3, text: "جب اﷲ کی مدد اور فتح آپہنچے،" },
    { ayatNo: 2, ayatId: 2, surahNo: 3, surahId: id_of_surah_3, text: "اور آپ لوگوں کو دیکھ لیں (کہ) وہ اﷲ کے دین میں جوق دَر جوق داخل ہو رہے ہیں" },
    { ayatNo: 3, ayatId: 3, surahNo: 3, surahId: id_of_surah_3, text: "تو آپ (تشکراً) اپنے رب کی حمد کے ساتھ تسبیح فرمائیں اور (تواضعاً) اس سے استغفار کریں، بیشک وہ بڑا ہی توبہ قبول فرمانے والا (اور مزید رحمت کے ساتھ رجوع فرمانے والا) ہے،" },

    //surah quraish
    { ayatNo: 1, ayatId: 1, surahNo: 4, surahId: id_of_surah_4, text: "قریش کو رغبت دلانے کے سبب سے،" },
    { ayatNo: 2, ayatId: 2, surahNo: 4, surahId: id_of_surah_4, text: "انہیں سردیوں اور گرمیوں کے (تجارتی) سفر سے مانوس کر دیا،" },
    { ayatNo: 3, ayatId: 3, surahNo: 4, surahId: id_of_surah_4, text: "پس انہیں چاہئے کہ اس گھر (خانہ کعبہ) کے رب کی عبادت کریں (تاکہ اس کی شکر گزاری ہو)،" },
    { ayatNo: 4, ayatId: 4, surahNo: 4, surahId: id_of_surah_4, text: "جس نے انہیں بھوک (یعنی فقر و فاقہ کے حالات) میں کھانا دیا (یعنی رِزق فراہم کیا) اور (دشمنوں کے) خوف سے امن بخشا (یعنی محفوظ و مامون زندگی سے نوازا)،" },

    //surah fatiha
    { ayatNo: 1, ayatId: 1, surahNo: 5, surahId: id_of_surah_5, text: "سب تعریفیں اللہ ہی کے لئے ہیں جو تمام جہانوں کی پرورش فرمانے والا ہے" },
    { ayatNo: 2, ayatId: 2, surahNo: 5, surahId: id_of_surah_5, text: "نہایت مہربان بہت رحم فرمانے والا ہے" },
    { ayatNo: 3, ayatId: 3, surahNo: 5, surahId: id_of_surah_5, text: "روزِ جزا کا مالک ہے" },
    { ayatNo: 4, ayatId: 4, surahNo: 5, surahId: id_of_surah_5, text: "(اے اللہ!) ہم تیری ہی عبادت کرتے ہیں اور ہم تجھ ہی سے مدد چاہتے ہیں" },
    { ayatNo: 5, ayatId: 5, surahNo: 5, surahId: id_of_surah_5, text: "ہمیں سیدھا راستہ دکھا" },
    { ayatNo: 6, ayatId: 6, surahNo: 5, surahId: id_of_surah_5, text: "ن لوگوں کا راستہ جن پر تو نے انعام فرمایا ان لوگوں کا نہیں جن پر غضب کیا گیا ہے اور نہ (ہی) گمراہوں کا" },

    //surah qadr
    { ayatNo: 1, ayatId: 1, surahNo: 6, surahId: id_of_surah_6, text: "بیشک ہم نے اس (قرآن) کو شبِ قدر میں اتارا ہے" },
    { ayatNo: 2, ayatId: 2, surahNo: 6, surahId: id_of_surah_6, text: "اور آپ کیا سمجھے ہیں (کہ) شبِ قدر کیا ہے" },
    { ayatNo: 3, ayatId: 3, surahNo: 6, surahId: id_of_surah_6, text: "شبِ قدر (فضیلت و برکت اور اَجر و ثواب میں) ہزار مہینوں سے بہتر ہے،" },
    { ayatNo: 4, ayatId: 4, surahNo: 6, surahId: id_of_surah_6, text: "اس (رات) میں فرشتے اور روح الامین (جبرائیل) اپنے رب کے حکم سے (خیر و برکت کے) ہر امر کے ساتھ اترتے ہیں" },
    { ayatNo: 5, ayatId: 5, surahNo: 6, surahId: id_of_surah_6, text: "یہ (رات) طلوعِ فجر تک (سراسر) سلامتی ہے" },

    //surah falaq
    { ayatNo: 1, ayatId: 1, surahNo: 7, surahId: id_of_surah_7, text: "آپ عرض کیجئے کہ میں (ایک) دھماکے سے انتہائی تیزی کے ساتھ (کائنات کو) وجود میں لانے والے رب کی پناہ مانگتا ہوں،" },
    { ayatNo: 2, ayatId: 2, surahNo: 7, surahId: id_of_surah_7, text: "ہر اس چیز کے شر (اور نقصان) سے جو اس نے پیدا فرمائی ہے،" },
    { ayatNo: 3, ayatId: 3, surahNo: 7, surahId: id_of_surah_7, text: "اور (بالخصوص) اندھیری رات کے شر سے جب (اس کی) ظلمت چھا جائے،" },
    { ayatNo: 4, ayatId: 4, surahNo: 7, surahId: id_of_surah_7, text: "اور گرہوں میں پھونک مارنے والی جادوگرنیوں (اور جادوگروں) کے شر سے،" },
    { ayatNo: 5, ayatId: 5, surahNo: 7, surahId: id_of_surah_7, text: "اور ہر حسد کرنے والے کے شر سے جب وہ حسد کرے،" },

    //surah fil
    { ayatNo: 1, ayatId: 1, surahNo: 8, surahId: id_of_surah_8, text: "کیا آپ نے نہیں دیکھا کہ آپ کے رب نے ہاتھی والوں کے ساتھ کیا سلوک کیا،" },
    { ayatNo: 2, ayatId: 2, surahNo: 8, surahId: id_of_surah_8, text: "?کیا اس نے ان کے مکر و فریب کو باطل و ناکام نہیں کر دیا" },
    { ayatNo: 3, ayatId: 3, surahNo: 8, surahId: id_of_surah_8, text: "اور اس نے ان پر (ہر سمت سے) پرندوں کے جھنڈ کے جھنڈ بھیج دیئے" },
    { ayatNo: 4, ayatId: 4, surahNo: 8, surahId: id_of_surah_8, text: "جو ان پر کنکریلے پتھر مارتے تھے" },
    { ayatNo: 5, ayatId: 5, surahNo: 8, surahId: id_of_surah_8, text: "پھر (اﷲ نے) ان کو کھائے ہوئے بھوسے کی طرح (پامال) کر دیا" },

    //surah masad
    { ayatNo: 1, ayatId: 1, surahNo: 9, surahId: id_of_surah_9, text: "ابولہب کے دونوں ہاتھ ٹوٹ جائیں اور وہ تباہ ہو جائے (اس نے ہمارے حبیب پر ہاتھ اٹھانے کی کوشش کی ہے)،" },
    { ayatNo: 2, ayatId: 2, surahNo: 9, surahId: id_of_surah_9, text: "اسے اس کے (موروثی) مال نے کچھ فائدہ نہ پہنچایا اور نہ ہی اس کی کمائی نے،" },
    { ayatNo: 3, ayatId: 3, surahNo: 9, surahId: id_of_surah_9, text: "عنقریب وہ شعلوں والی آگ میں جا پڑے گا" },
    { ayatNo: 4, ayatId: 4, surahNo: 9, surahId: id_of_surah_9, text: "اور اس کی (خبیث) عورت (بھی) جو (کانٹے دار) لکڑیوں کا بوجھ (سر پر) اٹھائے پھرتی ہے، (اور ہمارے حبیب کے تلووں کو زخمی کرنے کے لئے رات کو ان کی راہوں میں بچھا دیتی ہے)،" },
    { ayatNo: 5, ayatId: 5, surahNo: 9, surahId: id_of_surah_9, text: "اس کی گردن میں کھجور کی چھال کا (وہی) رسّہ ہوگا (جس سے کانٹوں کا گٹھا باندھتی ہے)،" },

    //surah ikhlas
    { ayatNo: 1, ayatId: 1, surahNo: 10, surahId: id_of_surah_10, text: "(اے نبئ مکرّم!) آپ فرما دیجئے: وہ اﷲ ہے جو یکتا ہے،" },
    { ayatNo: 2, ayatId: 2, surahNo: 10, surahId: id_of_surah_10, text: "اﷲ سب سے بے نیاز، سب کی پناہ اور سب پر فائق ہے،" },
    { ayatNo: 3, ayatId: 3, surahNo: 10, surahId: id_of_surah_10, text: "نہ اس سے کوئی پیدا ہوا ہے اور نہ ہی وہ پیدا کیا گیا ہے" },
    { ayatNo: 4, ayatId: 4, surahNo: 10, surahId: id_of_surah_10, text: "اور نہ ہی اس کا کوئی ہمسر ہے،" },

    //surah kafirun
    { ayatNo: 1, ayatId: 1, surahNo: 11, surahId: id_of_surah_11, text: "آپ فرما دیجئے: اے کافرو!،" },
    { ayatNo: 2, ayatId: 2, surahNo: 11, surahId: id_of_surah_11, text: "میں ان (بتوں) کی عبادت نہیں کرتا جنہیں تم پوجتے ہو" },
    { ayatNo: 3, ayatId: 3, surahNo: 11, surahId: id_of_surah_11, text: "اور نہ تم اس (رب) کی عبادت کرنے والے ہو جس کی میں عبادت کرتا ہوں" },
    { ayatNo: 4, ayatId: 4, surahNo: 11, surahId: id_of_surah_11, text: "اور نہ (ہی) میں (آئندہ کبھی) ان کی عبادت کرنے والا ہوں جن (بتوں) کی تم پرستش کرتے ہو" },
    { ayatNo: 5, ayatId: 5, surahNo: 11, surahId: id_of_surah_11, text: "اور نہ (ہی) تم اس کی عبادت کرنے والے ہو جس (رب) کی میں عبادت کرتا ہوں" },
    { ayatNo: 6, ayatId: 6, surahNo: 11, surahId: id_of_surah_11, text: "(سو) تمہارا دین تمہارے لئے اور میرا دین میرے لئے ہے،" },

    //surah nas
    { ayatNo: 1, ayatId: 1, surahNo: 12, surahId: id_of_surah_12, text: "آپ عرض کیجئے کہ میں (سب) انسانوں کے رب کی پناہ مانگتا ہوں" },
    { ayatNo: 2, ayatId: 2, surahNo: 12, surahId: id_of_surah_12, text: "جو (سب) لوگوں کا بادشاہ ہے" },
    { ayatNo: 3, ayatId: 3, surahNo: 12, surahId: id_of_surah_12, text: "جو (ساری) نسلِ انسانی کا معبود ہے" },
    { ayatNo: 4, ayatId: 4, surahNo: 12, surahId: id_of_surah_12, text: "وسوسہ انداز (شیطان) کے شر سے جو (اﷲ کے ذکر کے اثر سے) پیچھے ہٹ کر چھپ جانے والا ہے" },
    { ayatNo: 5, ayatId: 5, surahNo: 12, surahId: id_of_surah_12, text: "جو لوگوں کے دلوں میں وسوسہ ڈالتا ہے" },
    { ayatNo: 6, ayatId: 6, surahNo: 12, surahId: id_of_surah_12, text: "خواہ وہ (وسوسہ انداز شیطان) جنات میں سے ہو یا انسانوں میں سے" }]);

    const englishtranslationcollection = db.collection("englishtranslation");
    await englishtranslationcollection.insertMany([
    //surah kawther
    { ayatNo: 1, ayatId: 1, surahNo: 1, surahId: id_of_surah_1, text: 'We have given you plenty.' },
    { ayatNo: 2, ayatId: 2, surahNo: 1, surahId: id_of_surah_1, text: 'So pray to your Lord and sacrifice.' },
    { ayatNo: 3, ayatId: 3, surahNo: 1, surahId: id_of_surah_1, text: 'He who hates you is the loser.' },

    //surah asr
    { ayatNo: 1, ayatId: 1, surahNo: 2, surahId: id_of_surah_2, text: 'By Time.' },
    { ayatNo: 2, ayatId: 2, surahNo: 2, surahId: id_of_surah_2, text: 'The human being is in loss.' },
    { ayatNo: 3, ayatId: 3, surahNo: 2, surahId: id_of_surah_2, text: 'Except those who believe, and do good works, and encourage truth, and recommend patience.' },

    //surah nasr
    { ayatNo: 1, ayatId: 1, surahNo: 3, surahId: id_of_surah_3, text: 'When there comes Allah’s victory, and conquest.' },
    { ayatNo: 2, ayatId: 2, surahNo: 3, surahId: id_of_surah_3, text: 'And you see the people entering Allah’s religion in multitudes.' },
    { ayatNo: 3, ayatId: 3, surahNo: 3, surahId: id_of_surah_3, text: 'Then celebrate the praise of your Lord, and seek His forgiveness. He is the Accepter of Repentance.' },

    //surah quraish
    { ayatNo: 1, ayatId: 1, surahNo: 4, surahId: id_of_surah_4, text: 'For the security of Quraish.' },
    { ayatNo: 2, ayatId: 2, surahNo: 4, surahId: id_of_surah_4, text: 'Their security during winter and summer journeys.' },
    { ayatNo: 3, ayatId: 3, surahNo: 4, surahId: id_of_surah_4, text: 'Let them worship the Lord of this House.' },
    { ayatNo: 4, ayatId: 4, surahNo: 4, surahId: id_of_surah_4, text: 'Who has fed them against hunger, and has secured them against fear.' },

    //surah fatiha
    { ayatNo: 1, ayatId: 1, surahNo: 5, surahId: id_of_surah_5, text: 'Praise be to Allah, Lord of the Worlds.' },
    { ayatNo: 2, ayatId: 2, surahNo: 5, surahId: id_of_surah_5, text: 'The Most Gracious, the Most Merciful.' },
    { ayatNo: 3, ayatId: 3, surahNo: 5, surahId: id_of_surah_5, text: 'Master of the Day of Judgment.' },
    { ayatNo: 4, ayatId: 4, surahNo: 5, surahId: id_of_surah_5, text: 'It is You we worship, and upon You we call for help.' },
    { ayatNo: 5, ayatId: 5, surahNo: 5, surahId: id_of_surah_5, text: 'Guide us to the straight path.' },
    { ayatNo: 6, ayatId: 6, surahNo: 5, surahId: id_of_surah_5, text: 'The path of those You have blessed, not of those against whom there is anger, nor of those who are misguided.' },

    //surah qadr
    { ayatNo: 1, ayatId: 1, surahNo: 6, surahId: id_of_surah_6, text: 'We sent it down on the Night of Decree.' },
    { ayatNo: 2, ayatId: 2, surahNo: 6, surahId: id_of_surah_6, text: 'But what will convey to you what the Night of Decree is?' },
    { ayatNo: 3, ayatId: 3, surahNo: 6, surahId: id_of_surah_6, text: 'The Night of Decree is better than a thousand months.' },
    { ayatNo: 4, ayatId: 4, surahNo: 6, surahId: id_of_surah_6, text: 'In it descend the angels and the Spirit, by the leave of their Lord, with every command.' },
    { ayatNo: 5, ayatId: 5, surahNo: 6, surahId: id_of_surah_6, text: 'Peace it is; until the rise of dawn.' },

    //surah falaq
    { ayatNo: 1, ayatId: 1, surahNo: 7, surahId: id_of_surah_7, text: 'Say, “I take refuge with the Lord of Daybreak.' },
    { ayatNo: 2, ayatId: 2, surahNo: 7, surahId: id_of_surah_7, text: 'From the evil of what He created.' },
    { ayatNo: 3, ayatId: 3, surahNo: 7, surahId: id_of_surah_7, text: 'And from the evil of the darkness as it gathers.' },
    { ayatNo: 4, ayatId: 4, surahNo: 7, surahId: id_of_surah_7, text: 'And from the evil of those who practice sorcery.' },
    { ayatNo: 5, ayatId: 5, surahNo: 7, surahId: id_of_surah_7, text: 'And from the evil of an envious when he envies.”' },

    //surah fil
    { ayatNo: 1, ayatId: 1, surahNo: 8, surahId: id_of_surah_8, text: 'Have you not considered how your Lord dealt with the People of the Elephant?' },
    { ayatNo: 2, ayatId: 2, surahNo: 8, surahId: id_of_surah_8, text: 'Did He not make their plan go wrong?' },
    { ayatNo: 3, ayatId: 3, surahNo: 8, surahId: id_of_surah_8, text: 'He sent against them swarms of birds.' },
    { ayatNo: 4, ayatId: 4, surahNo: 8, surahId: id_of_surah_8, text: 'Throwing at them rocks of baked clay.' },
    { ayatNo: 5, ayatId: 5, surahNo: 8, surahId: id_of_surah_8, text: 'Leaving them like chewed-up leaves.' },

    //surah masad
    { ayatNo: 1, ayatId: 1, surahNo: 9, surahId: id_of_surah_9, text: 'Condemned are the hands of Abee Lahab, and he is condemned.' },
    { ayatNo: 2, ayatId: 2, surahNo: 9, surahId: id_of_surah_9, text: 'His wealth did not avail him, nor did what he acquired.' },
    { ayatNo: 3, ayatId: 3, surahNo: 9, surahId: id_of_surah_9, text: 'He will burn in a Flaming Fire.' },
    { ayatNo: 4, ayatId: 4, surahNo: 9, surahId: id_of_surah_9, text: 'And his wife—the firewood carrier.' },
    { ayatNo: 5, ayatId: 5, surahNo: 9, surahId: id_of_surah_9, text: 'Around her neck is a rope of thorns.' },

    //surah ikhlas
    { ayatNo: 1, ayatId: 1, surahNo: 10, surahId: id_of_surah_10, text: 'Say, “He is Allah, the One.' },
    { ayatNo: 2, ayatId: 2, surahNo: 10, surahId: id_of_surah_10, text: 'Allah, the Absolute.' },
    { ayatNo: 3, ayatId: 3, surahNo: 10, surahId: id_of_surah_10, text: 'He begets not, nor was He begotten.' },
    { ayatNo: 4, ayatId: 4, surahNo: 10, surahId: id_of_surah_10, text: 'And there is none comparable to Him.”' },

    //surah kafirun
    { ayatNo: 1, ayatId: 1, surahNo: 11, surahId: id_of_surah_11, text: 'Say, “O disbelievers.' },
    { ayatNo: 2, ayatId: 2, surahNo: 11, surahId: id_of_surah_11, text: 'I do not worship what you worship.' },
    { ayatNo: 3, ayatId: 3, surahNo: 11, surahId: id_of_surah_11, text: 'Nor do you worship what I worship.' },
    { ayatNo: 4, ayatId: 4, surahNo: 11, surahId: id_of_surah_11, text: 'Nor do I serve what you serve.' },
    { ayatNo: 5, ayatId: 5, surahNo: 11, surahId: id_of_surah_11, text: 'Nor do you serve what I serve.' },
    { ayatNo: 6, ayatId: 6, surahNo: 11, surahId: id_of_surah_11, text: 'You have your way, and I have my way.”' },

    //surah nas
    { ayatNo: 1, ayatId: 1, surahNo: 12, surahId: id_of_surah_12, text: 'Say, “I seek refuge in the Lord of mankind.' },
    { ayatNo: 2, ayatId: 2, surahNo: 12, surahId: id_of_surah_12, text: 'The King of mankind.' },
    { ayatNo: 3, ayatId: 3, surahNo: 12, surahId: id_of_surah_12, text: 'The Allah of mankind.' },
    { ayatNo: 4, ayatId: 4, surahNo: 12, surahId: id_of_surah_12, text: 'From the evil of the sneaky whisperer.' },
    { ayatNo: 5, ayatId: 5, surahNo: 12, surahId: id_of_surah_12, text: 'Who whispers into the hearts of people.' },
    { ayatNo: 6, ayatId: 6, surahNo: 12, surahId: id_of_surah_12, text: 'From among jinn and among people.”' }]);
    console.log('Inserted Quranic verses data');
}