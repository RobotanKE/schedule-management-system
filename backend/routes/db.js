const { Pool } = require('pg');
require('dotenv').config({ path: './psql.env' });

// Debug database connection
console.log('DB User:', process.env.PGUSER);
console.log('DB Host:', process.env.PGHOST);
console.log('DB Name:', process.env.PGDATABASE);

const pool = new Pool({
   user: process.env.PGUSER,
   host: process.env.PGHOST,
   database: process.env.PGDATABASE,
   password: process.env.PGPASSWORD,
   port: process.env.PGPORT,
});

// Add task column to timeWeek table
const addTaskColumnToTimeWeek = async () => {
   try {
      await pool.query(`
            ALTER TABLE timeWeek 
            ADD COLUMN IF NOT EXISTS task TEXT;
        `);
      console.log("Column 'task' added to 'timeWeek' table");
   } catch (error) {
      console.error("Error adding column to 'timeWeek':", error);
   }
};

// Create all main tables
const createTables = async () => {
   try {
      await pool.query(`
            CREATE TABLE IF NOT EXISTS clients ( 
                id SERIAL PRIMARY KEY,
                name VARCHAR(50),
                surname VARCHAR(50),
                lastName VARCHAR(50),
                birthday DATE
            );

            CREATE TABLE IF NOT EXISTS specialists (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50),
                surname VARCHAR(50),
                lastName VARCHAR(50),
                department VARCHAR(20),
                post VARCHAR(25)
            );

            CREATE TABLE IF NOT EXISTS timeWeek (
                id SERIAL PRIMARY KEY,
                client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
                spec_id INTEGER REFERENCES specialists(id) ON DELETE CASCADE,
                dayOfWeek TEXT[] DEFAULT ARRAY['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'],
                t_start TIME,
                t_end TIME
            );

            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) CHECK (role IN ('editor', 'viewer')) DEFAULT 'viewer'
            );
        `);
      console.log('All tables created successfully');
   } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
   }
};

// Drop main tables (CASCADE removes dependent tables too)
const dropTables = async () => {
   try {
      await pool.query(`
            DROP TABLE IF EXISTS clients CASCADE;
            DROP TABLE IF EXISTS specialists CASCADE;
            DROP TABLE IF EXISTS timeWeek CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
            DROP TABLE IF EXISTS social_schedule CASCADE;
        `);
      console.log('Tables dropped successfully');
   } catch (error) {
      console.error('Error dropping tables:', error);
      throw error;
   }
};

// Create social_schedule table for special social events
const createSocialScheduleTable = async () => {
   try {
      await pool.query(`
            CREATE TABLE IF NOT EXISTS social_schedule (
                id SERIAL PRIMARY KEY,
                specialist_id INTEGER REFERENCES specialists(id) ON DELETE CASCADE,
                day_of_week VARCHAR(20) NOT NULL,
                date DATE NOT NULL,
                time_slot VARCHAR(20) NOT NULL,
                task TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(specialist_id, day_of_week, date, time_slot)
            );
        `);
      console.log("Table 'social_schedule' created or already exists");
   } catch (error) {
      console.error("Error creating 'social_schedule':", error);
   }
};

// Add ESRN column to clients (unique identifier)
const addEsrnColumnToClients = async () => {
   try {
      await pool.query(`
         ALTER TABLE clients
            ADD COLUMN IF NOT EXISTS esrn VARCHAR(20) UNIQUE;
      `);
      console.log("Column 'esrn' added to 'clients' table");
   } catch (error) {
      console.error("Error adding 'esrn' column:", error);
   }
};

// Add display_order column to specialists for custom sorting
const addDisplayOrderToSpecialists = async () => {
   try {
      await pool.query(`
            ALTER TABLE specialists 
            ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
            
            UPDATE specialists 
            SET display_order = id 
            WHERE display_order = 0 OR display_order IS NULL;
        `);
      console.log("Column 'display_order' added to 'specialists' table");
   } catch (error) {
      console.error("Error adding 'display_order' column:", error);
   }
};

// Complete database reset (destructive!)
const resetDB = async () => {
   console.warn('Resetting database... This will delete all data!');
   try {
      await dropTables();
      await createTables();
      await addEsrnColumnToClients();
      await createSocialScheduleTable();
      console.log('Database reset and initialized successfully');
   } catch (error) {
      console.error('Error resetting database:', error);
      throw error;
   }
};

// Safe database update (adds missing columns/tables without dropping data)
const updateDatabase = async () => {
   try {
      await addDisplayOrderToSpecialists();
      await addEsrnColumnToClients();
      await addTaskColumnToTimeWeek();
      await createSocialScheduleTable();
      console.log('Database schema updated successfully');
   } catch (error) {
      console.error('Error updating database:', error);
      throw error;
   }
};

module.exports = {
   pool,
   updateDatabase,
   resetDB,
};