// utils/seeder.js
// Run: node utils/seeder.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const Product  = require('../models/Product');
const Category = require('../models/Category');

mongoose.connect(process.env.MONGO_URI).then(() => console.log('DB connected for seeding...'));

const categories = [
  { name: 'Vegetables',     slug: 'vegetables', emoji: '🥬', sortOrder: 1 },
  { name: 'Fruits',         slug: 'fruits',     emoji: '🍎', sortOrder: 2 },
  { name: 'Dairy & Eggs',   slug: 'dairy',      emoji: '🥛', sortOrder: 3 },
  { name: 'Grains & Pulses',slug: 'grains',     emoji: '🌾', sortOrder: 4 },
  { name: 'Herbs & Spices', slug: 'herbs',      emoji: '🌿', sortOrder: 5 },
  { name: 'Oils',           slug: 'oils',       emoji: '🫙', sortOrder: 6 },
  { name: 'Honey',          slug: 'honey',      emoji: '🍯', sortOrder: 7 },
];

const seedDB = async () => {
  try {
    // Clear existing data
    await Promise.all([User.deleteMany(), Product.deleteMany(), Category.deleteMany()]);
    console.log('🗑️  Cleared existing data');

    // Seed categories
    const cats = await Category.insertMany(categories);
    const catMap = {};
    cats.forEach(c => { catMap[c.slug] = c._id; });
    console.log('📂 Categories seeded:', cats.length);

    // Seed admin user
    const admin = await User.create({
      firstName: 'Aeindri', lastName: 'Admin',
      email: 'admin@aeindrifarms.com',
      phone: '9999999999',
      password: 'Admin@1234',
      role: 'admin', isVerified: true,
    });
    console.log('👤 Admin created: admin@aeindrifarms.com / Admin@1234');

    // Seed test customer
    await User.create({
      firstName: 'Priya', lastName: 'Rajan',
      email: 'priya@test.com',
      phone: '9876543210',
      password: 'Test@1234',
      role: 'customer', isVerified: true,
    });
    console.log('👤 Test customer: priya@test.com / Test@1234');

    // Seed products
    const products = [
      { name:'Fresh Tomatoes',    emoji:'🍅', category:catMap['vegetables'], price:35,  mrp:45,  unit:'1 kg',    stock:85,  badge:'Farm Fresh',  description:'Juicy, sun-ripened tomatoes from our farms. Perfect for curries and salads.', isFeatured:true, isOrganic:true, shelfLife:'4-5 days' },
      { name:'Baby Spinach',      emoji:'🥬', category:catMap['vegetables'], price:25,  mrp:30,  unit:'500 g',   stock:62,  badge:'Organic',     description:'Tender baby spinach leaves, freshly harvested and packed.', isFeatured:true, isOrganic:true, shelfLife:'2-3 days' },
      { name:'Carrots',           emoji:'🥕', category:catMap['vegetables'], price:40,  mrp:50,  unit:'1 kg',    stock:48,  badge:'Fresh',       description:'Crunchy, sweet carrots — great for juicing and cooking.', shelfLife:'5-7 days' },
      { name:'Brinjal',           emoji:'🍆', category:catMap['vegetables'], price:30,  mrp:38,  unit:'500 g',   stock:55,  badge:'',            description:'Fresh brinjal from our partner farms.', shelfLife:'4-5 days' },
      { name:'Ladies Finger',     emoji:'🫑', category:catMap['vegetables'], price:28,  mrp:35,  unit:'500 g',   stock:70,  badge:'Fresh',       description:'Tender okra, hand-picked at the right stage.', shelfLife:'3-4 days' },
      { name:'Alphonso Mangoes',  emoji:'🥭', category:catMap['fruits'],     price:120, mrp:150, unit:'1 kg',    stock:30,  badge:'Seasonal',    description:'The king of fruits — authentic Alphonso mangoes.', isFeatured:true, shelfLife:'3-5 days' },
      { name:'Bananas',           emoji:'🍌', category:catMap['fruits'],     price:50,  mrp:60,  unit:'Dozen',   stock:100, badge:'',            description:'Farm-fresh Nendran bananas.', shelfLife:'4-6 days' },
      { name:'Pomegranate',       emoji:'🍎', category:catMap['fruits'],     price:90,  mrp:110, unit:'500 g',   stock:25,  badge:'Sale',        description:'Ruby-red pomegranates, bursting with antioxidants.', shelfLife:'7-10 days' },
      { name:'Guava',             emoji:'🍈', category:catMap['fruits'],     price:45,  mrp:55,  unit:'500 g',   stock:60,  badge:'Fresh',       description:'Sweet and crunchy farm guavas.', shelfLife:'5-7 days' },
      { name:'Farm Milk',         emoji:'🥛', category:catMap['dairy'],      price:65,  mrp:70,  unit:'1 Litre', stock:150, badge:'Daily Fresh', description:'Fresh cow milk from our partner dairy farms, delivered daily.', isFeatured:true, shelfLife:'1-2 days' },
      { name:'Country Eggs',      emoji:'🥚', category:catMap['dairy'],      price:80,  mrp:90,  unit:'12 pcs',  stock:90,  badge:'Free Range',  description:'Farm-fresh free-range country eggs, rich in protein.', shelfLife:'10-12 days' },
      { name:'Curd',              emoji:'🥛', category:catMap['dairy'],      price:45,  mrp:52,  unit:'500 g',   stock:80,  badge:'Fresh',       description:'Thick, creamy curd made from fresh farm milk.', shelfLife:'2-3 days' },
      { name:'Toor Dal',          emoji:'🌾', category:catMap['grains'],     price:110, mrp:130, unit:'1 kg',    stock:9,   badge:'Organic',     description:'Organically grown toor dal, sun-dried and cleaned.', lowStockAt:15, shelfLife:'12 months' },
      { name:'Red Rice',          emoji:'🌾', category:catMap['grains'],     price:90,  mrp:110, unit:'1 kg',    stock:50,  badge:'',            description:'Nutritious red rice rich in fibre and minerals.', shelfLife:'12 months' },
      { name:'Rajma',             emoji:'🌾', category:catMap['grains'],     price:120, mrp:140, unit:'1 kg',    stock:45,  badge:'Organic',     description:'Plump, organic kidney beans sourced from Himalayan farms.', shelfLife:'12 months' },
      { name:'Fresh Coriander',   emoji:'🌿', category:catMap['herbs'],      price:15,  mrp:20,  unit:'Bunch',   stock:60,  badge:'',            description:'Aromatic fresh coriander leaves, great for garnishing.', shelfLife:'2-3 days' },
      { name:'Curry Leaves',      emoji:'🌿', category:catMap['herbs'],      price:10,  mrp:15,  unit:'Bunch',   stock:70,  badge:'',            description:'Fresh curry leaves — essential for South Indian cooking.', shelfLife:'4-5 days' },
      { name:'Green Chillies',    emoji:'🌶️', category:catMap['herbs'],      price:20,  mrp:25,  unit:'100 g',   stock:80,  badge:'Spicy 🌶️',   description:'Farm-fresh green chillies with the perfect heat.', shelfLife:'5-7 days' },
      { name:'Cold-Pressed Groundnut Oil', emoji:'🫙', category:catMap['oils'], price:220, mrp:260, unit:'1 Litre', stock:40, badge:'Cold Pressed', description:'Pure cold-pressed groundnut oil, extracted without heat. Retains all natural nutrients.', isFeatured:true, shelfLife:'6 months' },
      { name:'Cold-Pressed Sesame Oil',    emoji:'🫙', category:catMap['oils'], price:280, mrp:320, unit:'500 ml', stock:30, badge:'Cold Pressed', description:'Traditional chekku sesame oil, stone-pressed the old way.', shelfLife:'6 months' },
      { name:'Raw Forest Honey',  emoji:'🍯', category:catMap['honey'],      price:320, mrp:380, unit:'500 g',   stock:8,   badge:'Pure & Raw',  description:'Unprocessed raw honey collected from wild forest beehives. No additives, no heating.', isFeatured:true, lowStockAt:10, shelfLife:'24 months' },
      { name:'Multifloral Honey', emoji:'🍯', category:catMap['honey'],      price:250, mrp:300, unit:'500 g',   stock:22,  badge:'',            description:'Sweet multifloral honey from our partner apiaries.', shelfLife:'24 months' },
    ];

    const created = await Product.insertMany(products);
    console.log('🥬 Products seeded:', created.length);

    console.log('\n✅ Database seeded successfully!');
    console.log('🌿 Aeindri Farms is ready!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedDB();
