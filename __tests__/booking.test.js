const request = require('supertest');
const app = require('../app'); // Your Express app
let server, userAToken, userBToken;

beforeAll(async () => {
  // Start the server on a test-specific port (4000)
  server = app.listen(4000);

  // Log in User A
  const userARes = await request(server)
    .post('/auth/login')
    .send({
      email: 'userA@example.com',
      password: 'passwordA',
    });

  // Log the response for debugging
  console.log("User A Login Response: ", userARes.body);
  userAToken = userARes.body.token;

  // Log in User B
  const userBRes = await request(server)
    .post('/auth/login')
    .send({
      email: 'userB@example.com',
      password: 'passwordB',
    });

  // Log the response for debugging
  console.log("User B Login Response: ", userBRes.body);
  userBToken = userBRes.body.token;
});

afterAll(async () => {
  // Close the server after all tests are done
  server.close();
});

describe('Simulate Concurrent Booking with 1 Seat Left', () => {
  it('should allow one user to book the seat and reject the other', async () => {
    const trainId = 1; // Assuming the train with ID 1 has only 1 seat left

    // Simulate two users trying to book the seat at the same time
    const userABooking = request(server)
      .post('/book/book-seat')
      .set('Authorization', `Bearer ${userAToken}`)  // Ensure the token is valid and correctly passed
      .send({ trainId });

    const userBBooking = request(server)
      .post('/book/book-seat')
      .set('Authorization', `Bearer ${userBToken}`)  // Ensure the token is valid and correctly passed
      .send({ trainId });

    // Execute both booking requests concurrently
    const [userAResponse, userBResponse] = await Promise.all([userABooking, userBBooking]);

    // Log responses for debugging
    console.log("User A Booking Response: ", userAResponse.body);
    console.log("User B Booking Response: ", userBResponse.body);

    // One of the users should succeed, the other should fail due to no seats left
    const successfulResponse = userAResponse.statusCode === 200 ? userAResponse : userBResponse;
    const failedResponse = userAResponse.statusCode === 400 ? userAResponse : userBResponse;

    // Assert the successful response
    expect(successfulResponse.statusCode).toBe(200);
    expect(successfulResponse.body).toEqual({ message: 'Seat booked successfully' });

    // Assert the failure response (no seats available)
    expect(failedResponse.statusCode).toBe(400);
    expect(failedResponse.body).toEqual({ error: 'No seats available' });
  });
});
