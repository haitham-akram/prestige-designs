/**
 * Fix Orders with Customizable Products
 * This script fixes orders that have customizable products but incorrect flags
 */

const mongoose = require('mongoose')

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prestige-designs'
