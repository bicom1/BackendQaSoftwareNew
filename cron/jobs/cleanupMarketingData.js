const mongoose = require('mongoose');


const cleanupMarketingData = async () => {
  console.log('🕛 Running marketing data cleanup at', new Date());
  
  try {
    const result = await mongoose.connection.collection('marketingdatas').deleteMany({
      createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    
    console.log(`✅ Deleted ${result.deletedCount} old marketing records`);
    return { success: true, deletedCount: result.deletedCount };
  } catch (err) {
    console.error('❌ Marketing data cleanup error:', err);
    throw err;
  }
};

module.exports = cleanupMarketingData;