const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { pool } = require('./db');
const express = require('express');
const { authenticateToken, authorizeRole } = require('./users');
const router = express.Router();

// Secret key should be in .env, not hardcoded
const SECRET_KEY = process.env.JWT_SECRET;

// Helper: parse Excel date number to YYYY-MM-DD
const parseExcelDate = (dateValue) => {
    if (!dateValue) return null;
    if (typeof dateValue === 'number') {
        const dateObj = xlsx.SSF.parse_date_code(dateValue);
        return `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
    }
    if (typeof dateValue === 'string') {
        const [day, month, year] = dateValue.split('.');
        if (day && month && year) return `${year}-${month}-${day}`;
    }
    return null;
};

// Load data from parsed Excel to database
const loadDataToDatabase = async (data) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const item of data) {
            const fullname = item['ФИО'];
            if (!fullname) continue;

            let [surname, name, lastName] = fullname.split(' ');
            if (!lastName) {
                console.warn('Failed to parse fullname:', fullname);
                lastName = ' ';
            }

            const birthdayString = item['9/4/06'];
            const birthday = parseExcelDate(birthdayString);
            const esrn = item['ЭСРН'] ? String(item['ЭСРН']).trim() : null;

            await client.query(
                `INSERT INTO clients (name, surname, lastName, birthday, esrn) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [name, surname, lastName, birthday, esrn]
            );
        }

        await client.query('COMMIT');
        console.log('Data successfully loaded to database');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error loading data:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Load from Excel file - path should be configurable
const loadFromFileXML = async (filePath = null) => {
    try {
        const excelPath = filePath || process.env.EXCEL_DATA_PATH;
        if (!excelPath) {
            throw new Error('Excel file path not configured. Set EXCEL_DATA_PATH in .env');
        }

        const workbook = xlsx.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        await loadDataToDatabase(sheetData);
    } catch (error) {
        console.error('Error processing Excel file:', error);
        throw error;
    }
};

// ============ CLIENTS CRUD ============

router.delete('/clients/:id', authenticateToken, authorizeRole('editor'), async (req, res) => {
    const clientId = req.params.id;
    try {
        const result = await pool.query('DELETE FROM clients WHERE id = $1', [clientId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.status(200).json({ message: 'Client deleted successfully' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ message: 'Error deleting client' });
    }
});

router.put('/clients/:id', authenticateToken, authorizeRole('editor'), async (req, res) => {
    const clientId = req.params.id;
    const { name, surname, lastname, birthday, esrn } = req.body;
    try {
        const result = await pool.query(
            'UPDATE clients SET name = $1, surname = $2, lastname = $3, birthday = $4, esrn = $5 WHERE id = $6',
            [name, surname, lastname, birthday, esrn, clientId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.status(200).json({ message: 'Client updated successfully' });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ message: 'Error updating client' });
    }
});

router.post('/clients', authenticateToken, authorizeRole('editor'), async (req, res) => {
    const { name, surname, lastname, birthday, esrn } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO clients (name, surname, lastname, birthday, esrn)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, surname, lastname, birthday, esrn]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding client:', error);
        res.status(500).json({ message: 'Error adding client' });
    }
});

// ============ SPECIALISTS CRUD ============

router.delete('/specialists/:id', authenticateToken, authorizeRole('editor'), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM specialists WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Specialist not found' });
        }
        res.json({ message: 'Specialist deleted successfully' });
    } catch (error) {
        console.error('Error deleting specialist:', error);
        res.status(500).json({ message: 'Error deleting specialist' });
    }
});

router.put('/specialists/:id', authenticateToken, authorizeRole('editor'), async (req, res) => {
    const { id } = req.params;
    const { name, surname, lastname, department, post } = req.body;
    try {
        const result = await pool.query(
            `UPDATE specialists SET name = $1, surname = $2, lastname = $3, department = $4, post = $5
             WHERE id = $6 RETURNING *`,
            [name, surname, lastname, department, post, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Specialist not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating specialist:', error);
        res.status(500).json({ message: 'Error updating specialist' });
    }
});

router.post('/specialists', authenticateToken, authorizeRole('editor'), async (req, res) => {
    const { name, surname, lastname, department, post } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO specialists (name, surname, lastname, department, post)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, surname, lastname, department, post]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding specialist:', error);
        res.status(500).json({ message: 'Error adding specialist' });
    }
});

// ============ SCHEDULE (timeWeek) ============

router.delete('/dropTime/:id', authenticateToken, authorizeRole('editor'), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM timeWeek WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Schedule entry not found' });
        }
        res.status(200).json({ message: 'Entry deleted successfully', deletedEntry: result.rows[0] });
    } catch (error) {
        console.error('Error deleting schedule entry:', error);
        res.status(500).json({ message: 'Error deleting entry' });
    }
});

// Add schedule entry for client-specialist
router.post('/timeWeek/schedule', authenticateToken, authorizeRole('editor'), async (req, res) => {
    const { client_id, spec_id, day_of_week, t_start, t_end } = req.body;

    console.log('[POST /timeWeek/schedule] Received:', { client_id, spec_id, day_of_week, t_start, t_end });

    // Validate required fields
    if (!client_id || !spec_id || !day_of_week || !t_start || !t_end) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            message: 'client_id, spec_id, day_of_week, t_start, t_end are required'
        });
    }

    try {
        // Check if client exists
        const clientCheck = await pool.query('SELECT id, name, surname FROM clients WHERE id = $1', [client_id]);
        if (clientCheck.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Client not found'
            });
        }

        // Check if specialist exists
        const specCheck = await pool.query('SELECT id, name, surname, post FROM specialists WHERE id = $1', [spec_id]);
        if (specCheck.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Specialist not found'
            });
        }

        const client = clientCheck.rows[0];
        const specialist = specCheck.rows[0];

        // Insert new schedule entry
        const result = await pool.query(
            `INSERT INTO timeWeek (client_id, spec_id, dayOfWeek, t_start, t_end)
             VALUES ($1, $2, ARRAY[$3], $4, $5)
             RETURNING id, client_id, spec_id, dayOfWeek[1] as day_of_week, t_start, t_end`,
            [client_id, spec_id, day_of_week, t_start, t_end]
        );

        const newEntry = result.rows[0];

        console.log('[POST /timeWeek/schedule] Success, created ID:', newEntry.id);

        // IMPORTANT: Return ALL fields frontend expects
        res.status(201).json({
            success: true,
            id: newEntry.id,
            schedule: {
                id: newEntry.id,
                client_id: newEntry.client_id,
                spec_id: newEntry.spec_id,
                day_of_week: newEntry.day_of_week,
                t_start: newEntry.t_start,
                t_end: newEntry.t_end,
                // Client info
                cid: client.id,
                cname: client.name,
                csurname: client.surname,
                // Specialist info
                sid: specialist.id,
                sname: specialist.name,
                ssurname: specialist.surname,
                spost: specialist.post
            },
            message: 'Schedule entry added successfully'
        });
    } catch (err) {
        console.error('[POST /timeWeek/schedule] Error:', err);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: err.message
        });
    }
});

router.put('/timeWeek/:client_id/:spec_id', authenticateToken, authorizeRole('editor'), async (req, res) => {
    const { client_id, spec_id } = req.params;
    const { dayOfWeek, t_start, t_end } = req.body;

    console.log('[PUT /timeWeek] Updating:', { client_id, spec_id, dayOfWeek, t_start, t_end });

    if (!dayOfWeek && !t_start && !t_end) {
        return res.status(400).json({ message: 'At least one field to update is required' });
    }

    try {
        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCounter = 1;

        if (dayOfWeek) {
            updates.push(`dayOfWeek = ARRAY[$${paramCounter}]`);
            values.push(dayOfWeek);
            paramCounter++;
        }
        if (t_start) {
            updates.push(`t_start = $${paramCounter}`);
            values.push(t_start);
            paramCounter++;
        }
        if (t_end) {
            updates.push(`t_end = $${paramCounter}`);
            values.push(t_end);
            paramCounter++;
        }

        values.push(client_id, spec_id);

        const query = `
            UPDATE timeWeek
            SET ${updates.join(', ')}
            WHERE client_id = $${paramCounter} AND spec_id = $${paramCounter + 1}
            RETURNING id, client_id, spec_id, dayOfWeek[1] as day_of_week, t_start, t_end
        `;

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Schedule entry not found for this client-specialist pair' });
        }

        console.log('[PUT /timeWeek] Successfully updated:', result.rows[0]);

        res.status(200).json({
            message: 'Schedule updated successfully',
            schedule: result.rows[0]
        });
    } catch (error) {
        console.error('[PUT /timeWeek] Error:', error);
        res.status(500).json({ message: 'Error updating schedule: ' + error.message });
    }
});

// ============ AUTH ============

router.post('/register', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO users (username, password, role) VALUES ($1, $2, $3)
             RETURNING id, username, role`,
            [username, hashedPassword, role || 'viewer']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error during registration' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(`SELECT * FROM users WHERE username = $1`, [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            SECRET_KEY,
            { expiresIn: '1h' }
        );
        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
});

// ============ SEARCH ============

router.get("/search", async (req, res) => {
    try {
        const { esrn } = req.query;
        if (!esrn) {
            return res.status(400).json({ error: "ESRN parameter is required" });
        }
        const result = await pool.query("SELECT * FROM clients WHERE esrn LIKE $1", [`${esrn}%`]);
        res.json(result.rows);
    } catch (error) {
        console.error("ESRN search error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// ============ GET ENDPOINTS ============

router.get('/specialists', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM specialists ORDER BY display_order, id');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching specialists:', error);
        res.status(500).json({ message: 'Error fetching specialists' });
    }
});

router.get('/clients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clients ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ message: 'Error fetching clients' });
    }
});

router.get('/specialist/:specId', authenticateToken, async (req, res) => {
    const specId = parseInt(req.params.specId, 10);
    if (isNaN(specId)) {
        return res.status(400).json({ message: 'Invalid specialist ID' });
    }
    try {
        const result = await pool.query(
            `SELECT tw.id, tw.dayOfWeek[1] as day_of_week, tw.t_start, tw.t_end,
                    c.surname AS csurname, c.name AS cname, c.id AS cid
             FROM timeWeek tw
             LEFT JOIN clients c ON tw.client_id = c.id
             WHERE tw.spec_id = $1`,
            [specId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Schedule not found for this specialist' });
        }
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching specialist schedule:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/cl/:clientId', authenticateToken, async (req, res) => {
    const clientId = parseInt(req.params.clientId, 10);
    if (isNaN(clientId)) {
        return res.status(400).json({ message: 'Invalid client ID' });
    }
    try {
        const result = await pool.query(
            `SELECT tw.id, tw.dayOfWeek[1] as day_of_week, tw.t_start, tw.t_end,
                    s.surname AS ssurname, s.name AS sname, s.id AS sid
             FROM timeWeek tw
             LEFT JOIN specialists s ON tw.spec_id = s.id
             WHERE tw.client_id = $1`,
            [clientId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Schedule not found for this client' });
        }
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching client schedule:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/clients/specialist/:spec_id', async (req, res) => {
    const { spec_id } = req.params;
    try {
        const result = await pool.query(
            `SELECT DISTINCT c.id, c.name, c.surname, c.lastName
             FROM clients c
             JOIN timeWeek tw ON c.id = tw.client_id
             WHERE tw.spec_id = $1`,
            [spec_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No clients found for this specialist' });
        }
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching clients for specialist:', error);
        res.status(500).json({ message: 'Error fetching clients' });
    }
});

// Display order update for specialists
router.put('/:id', authenticateToken, authorizeRole('editor'), async (req, res) => {
    const { id } = req.params;
    const { display_order } = req.body;
    try {
        await pool.query('UPDATE specialists SET display_order = $1 WHERE id = $2', [display_order, id]);
        res.json({ message: 'Display order updated' });
    } catch (err) {
        console.error('Error updating display order:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ============ SOCIAL SCHEDULE (social_schedule) ============

// Add social schedule entry
router.post('/timeWeek/social-schedule', authenticateToken, authorizeRole('editor'), async (req, res) => {
    const { specialist_id, day_of_week, date, time_slot, task } = req.body;

    try {
        // Check if specialist is a social worker
        const specialistCheck = await pool.query(
            `SELECT id, post FROM specialists WHERE id = $1 AND post = 'Социальный работник'`,
            [specialist_id]
        );

        if (specialistCheck.rowCount === 0) {
            return res.status(400).json({
                message: 'Specialist not found or is not a social worker'
            });
        }

        // Check for conflict
        const conflictCheck = await pool.query(
            `SELECT * FROM social_schedule 
             WHERE specialist_id = $1 AND day_of_week = $2 AND date = $3 AND time_slot = $4`,
            [specialist_id, day_of_week, date, time_slot]
        );

        if (conflictCheck.rowCount > 0) {
            return res.status(400).json({
                message: 'Social worker already has a booking at this time'
            });
        }

        // Insert new entry
        const result = await pool.query(
            `INSERT INTO social_schedule (specialist_id, day_of_week, date, time_slot, task)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [specialist_id, day_of_week, date, time_slot, task]
        );

        // Get specialist info
        const specialistInfo = await pool.query(
            `SELECT name, surname FROM specialists WHERE id = $1`,
            [specialist_id]
        );

        res.status(201).json({
            message: 'Social schedule entry added successfully',
            schedule: {
                ...result.rows[0],
                sname: specialistInfo.rows[0].name,
                ssurname: specialistInfo.rows[0].surname
            }
        });
    } catch (err) {
        console.error('Error adding social schedule:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update social schedule task
router.put('/social-scheduler/:id', authenticateToken, authorizeRole('editor'), async (req, res) => {
    const { id } = req.params;
    const { task } = req.body;

    try {
        const result = await pool.query(
            `UPDATE social_schedule 
             SET task = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 RETURNING *`,
            [task, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Schedule entry not found' });
        }

        const updatedEntry = result.rows[0];

        const specialistInfo = await pool.query(
            `SELECT name, surname FROM specialists WHERE id = $1`,
            [updatedEntry.specialist_id]
        );

        res.json({
            message: 'Task updated successfully',
            schedule: {
                ...updatedEntry,
                sname: specialistInfo.rows[0].name,
                ssurname: specialistInfo.rows[0].surname
            }
        });
    } catch (err) {
        console.error('Error updating social schedule:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get social schedule by day
router.get('/timeWeek/social-schedule/', authenticateToken, async (req, res) => {
    const { dayId, date } = req.query;

    try {
        const query = `
            SELECT 
                ss.*,
                s.name as sname,
                s.surname as ssurname
            FROM social_schedule ss
            JOIN specialists s ON ss.specialist_id = s.id
            WHERE ss.day_of_week = $1 AND ss.date = $2
            ORDER BY ss.time_slot, s.surname
        `;

        const result = await pool.query(query, [dayId, date]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching social schedule:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get social schedule (alternative endpoint)
router.get('/social-schedule/:dayId', authenticateToken, async (req, res) => {
    const { dayId } = req.params;
    const { date } = req.query;

    try {
        const query = `
            SELECT 
                ss.*,
                s.name as sname,
                s.surname as ssurname
            FROM social_schedule ss
            JOIN specialists s ON ss.specialist_id = s.id
            WHERE ss.day_of_week = $1 AND ss.date = $2
            ORDER BY ss.time_slot, s.surname
        `;

        const result = await pool.query(query, [dayId, date]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching social schedule:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get specialist by ID
router.get('/spec/:specId', authenticateToken, async (req, res) => {
    const specId = parseInt(req.params.specId, 10);
    if (isNaN(specId)) {
        return res.status(400).json({ message: 'Invalid specialist ID' });
    }
    try {
        const result = await pool.query(`SELECT * FROM specialists WHERE id = $1`, [specId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Specialist not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching specialist:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get client by ID
router.get('/client_one/:clientId', authenticateToken, async (req, res) => {
    const clientId = parseInt(req.params.clientId, 10);
    if (isNaN(clientId)) {
        return res.status(400).json({ message: 'Invalid client ID' });
    }
    try {
        const result = await pool.query(`SELECT * FROM clients WHERE id = $1`, [clientId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get schedule by specialist ID (for timeWeek)
router.get('/timeWeek/spec/:specId', authenticateToken, async (req, res) => {
    const specId = parseInt(req.params.specId, 10);
    if (isNaN(specId)) {
        return res.status(400).json({ message: 'Invalid specialist ID' });
    }
    try {
        const result = await pool.query(
            `SELECT tw.*, c.name as client_name, c.surname as client_surname
             FROM timeWeek tw
             LEFT JOIN clients c ON tw.client_id = c.id
             WHERE tw.spec_id = $1`,
            [specId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Alternative update endpoint for schedule by ID
router.put('/timeWeek/:id', authenticateToken, authorizeRole('editor'), async (req, res) => {
    const { id } = req.params;
    const { dayOfWeek, t_start, t_end } = req.body;

    console.log('[PUT /timeWeek/:id] Updating entry:', { id, dayOfWeek, t_start, t_end });

    try {
        const updates = [];
        const values = [];
        let paramCounter = 1;

        if (dayOfWeek !== undefined) {
            updates.push(`dayOfWeek = ARRAY[$${paramCounter}]`);
            values.push(dayOfWeek);
            paramCounter++;
        }
        if (t_start !== undefined) {
            updates.push(`t_start = $${paramCounter}`);
            values.push(t_start);
            paramCounter++;
        }
        if (t_end !== undefined) {
            updates.push(`t_end = $${paramCounter}`);
            values.push(t_end);
            paramCounter++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(id);

        const query = `
            UPDATE timeWeek
            SET ${updates.join(', ')}
            WHERE id = $${paramCounter}
            RETURNING id, client_id, spec_id, dayOfWeek[1] as day_of_week, t_start, t_end
        `;

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Schedule entry not found' });
        }

        res.status(200).json({
            message: 'Schedule updated successfully',
            schedule: result.rows[0]
        });
    } catch (error) {
        console.error('[PUT /timeWeek/:id] Error:', error);
        res.status(500).json({ message: 'Error updating schedule: ' + error.message });
    }
});

// Delete social schedule entry
router.delete('/social-schedule/:specialistId/:dayId/:timeSlot', authenticateToken, authorizeRole('editor'), async (req, res) => {
    const { specialistId, dayId, timeSlot } = req.params;
    const { date } = req.query;

    console.log('=== DELETE SOCIAL SCHEDULE (alt route) ===');

    // Same logic as above
    if (!specialistId || !dayId || !timeSlot || !date) {
        return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    try {
        const decodedTimeSlot = decodeURIComponent(timeSlot);
        let formattedDate;
        if (date.includes('.')) {
            const [day, month, year] = date.split('.');
            formattedDate = `${year}-${month}-${day}`;
        } else {
            formattedDate = date;
        }

        const result = await pool.query(
            `DELETE FROM social_schedule
             WHERE specialist_id = $1 AND day_of_week = $2 AND time_slot = $3 AND date = $4
                 RETURNING *`,
            [specialistId, dayId, decodedTimeSlot, formattedDate]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Entry not found' });
        }

        res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});



module.exports = {
    loadFromFileXML,
    router
};