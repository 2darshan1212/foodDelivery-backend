import mongoose from 'mongoose';
import { config } from 'dotenv';
import { Post } from '../models/post.model.js';

// Load environment variables
config();

const MONGO_URI = process.env.MONGO_URI;

async function migratePosts() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully!');

    // Get all posts
    const posts = await Post.find({});
    console.log(`Found ${posts.length} posts to migrate.`);

    let migratedCount = 0;
    let errorCount = 0;

    // Iterate through each post
    for (const post of posts) {
      try {
        // Check if the post has old ratings structure
        if (post.ratings !== undefined && !post.rating) {
          console.log(`Migrating post ID: ${post._id}`);
          
          // Initialize the new rating structure
          post.rating = {
            average: 0,
            count: 0,
            ratings: []
          };
          
          // Initialize rating distribution
          post.ratingDistribution = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
          };
          
          // Use the old rating value as average if it exists
          if (typeof post.ratings === 'number') {
            post.rating.average = post.ratings;
            // If we had some rating before, assume at least one rating
            if (post.ratings > 0) {
              post.rating.count = 1;
              // Round to nearest whole number for distribution
              const roundedRating = Math.round(post.ratings);
              if (roundedRating >= 1 && roundedRating <= 5) {
                post.ratingDistribution[roundedRating] = 1;
              }
            }
          }
          
          // Remove the old ratings field
          post.ratings = undefined;
          
          // Set default values for vegetarian and spicyLevel if they don't exist
          if (post.vegetarian === undefined) {
            post.vegetarian = false;
          }
          
          if (post.spicyLevel === undefined) {
            post.spicyLevel = 'none';
          }
          
          // Save the updated post
          await post.save();
          migratedCount++;
          console.log(`Successfully migrated post ID: ${post._id}`);
        } else {
          // If the post already has the new structure, just ensure it has all fields
          let updated = false;
          
          if (!post.rating) {
            post.rating = {
              average: 0,
              count: 0,
              ratings: []
            };
            updated = true;
          }
          
          if (!post.ratingDistribution) {
            post.ratingDistribution = {
              1: 0,
              2: 0,
              3: 0,
              4: 0,
              5: 0
            };
            updated = true;
          }
          
          if (post.vegetarian === undefined) {
            post.vegetarian = false;
            updated = true;
          }
          
          if (post.spicyLevel === undefined) {
            post.spicyLevel = 'none';
            updated = true;
          }
          
          if (updated) {
            await post.save();
            migratedCount++;
            console.log(`Updated post ID: ${post._id} with missing fields`);
          }
        }
      } catch (postError) {
        console.error(`Error migrating post ID ${post._id}:`, postError);
        errorCount++;
      }
    }

    console.log('\nMigration Summary:');
    console.log(`Total posts: ${posts.length}`);
    console.log(`Successfully migrated/updated: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('\nMigration complete!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

// Run the migration
migratePosts().then(() => {
  console.log('Script execution completed.');
}); 