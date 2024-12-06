// const pool = require('../config/db');

// async function bookSeat(req, res) {
//   const { trainId } = req.body;
//   try {
//     await pool.query('BEGIN');
//     const result = await pool.query('SELECT seats FROM trains WHERE id = $1 FOR UPDATE', [trainId]);
//     const availableSeats = result.rows[0].seats;
//     if (availableSeats > 0) {
//       await pool.query('UPDATE trains SET seats = seats - 1 WHERE id = $1', [trainId]);
//       await pool.query('INSERT INTO bookings (user_id, train_id) VALUES ($1, $2)', [req.user.userId, trainId]);
//       await pool.query('COMMIT');
//       res.send('Seat booked successfully');
//     } else {
//       await pool.query('ROLLBACK');
//       res.status(400).send('No seats available');
//     }
//   } catch (error) {
//     await pool.query('ROLLBACK');
//     res.status(500).send('Error booking seat');
//   }
// }

// async function getBookingDetails(req, res) {
//   const { id } = req.params;
//   const result = await pool.query('SELECT * FROM bookings WHERE id = $1 AND user_id = $2', [id, req.user.userId]);
//   if (result.rows.length === 0) {
//     return res.status(404).send('Booking not found');
//   }
//   res.send(result.rows[0]);
// }

// module.exports = { bookSeat, getBookingDetails };


const pool = require('../config/db');

async function bookSeat(req, res) {
  const { trainId } = req.body;
  
  try {
    // Start a transaction
    await pool.query('BEGIN');

    // Check if the train exists and lock the row for seat availability (prevent race conditions)
    const result = await pool.query('SELECT seats FROM trains WHERE id = $1 FOR UPDATE', [trainId]);

    // Check if train exists
    if (result.rows.length === 0) {
      await pool.query('ROLLBACK');  // Rollback in case the train doesn't exist
      return res.status(404).send('Train not found');
    }

    const availableSeats = result.rows[0].seats;

    // Check if there are available seats
    if (availableSeats > 0) {
      // Decrease the seat count by 1
      await pool.query('UPDATE trains SET seats = seats - 1 WHERE id = $1', [trainId]);

      // Create a booking record
      await pool.query('INSERT INTO bookings (user_id, train_id) VALUES ($1, $2)', [req.user.userId, trainId]);

      // Commit the transaction
      await pool.query('COMMIT');
      return res.status(200).send({ message: 'Seat booked successfully' });
    } else {
      // If no seats available, rollback the transaction
      await pool.query('ROLLBACK');
      return res.status(400).send({ error: 'No seats available' });
    }
  } catch (error) {
    // Rollback on any error
    await pool.query('ROLLBACK');
    console.error('Error during booking:', error);
    return res.status(500).send({ error: 'Error booking seat' });
  }
}

async function getBookingDetails(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM bookings WHERE id = $1 AND user_id = $2', [id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).send({ error: 'Booking not found' });
    }

    return res.status(200).send(result.rows[0]);
  } catch (error) {
    console.error('Error fetching booking details:', error);
    return res.status(500).send({ error: 'Error fetching booking details' });
  }
}

module.exports = { bookSeat, getBookingDetails };
