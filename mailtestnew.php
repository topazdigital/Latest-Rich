<?php
// Database connection (update with your own credentials)
$servername = "localhost";
$username = "admin_date";
$password = "dj@Topaz2016";
$dbname = "admin_date";

$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$subject = "Your Subject Here";
$message = "Your message here.";
$headers = "From: your_email@example.com\r\n";

$batchSize = 100;
$offset = 0;
$i=1;
while (true) {

    // Get a batch of emails
    $sql = "SELECT email FROM users WHERE email != '' LIMIT $batchSize OFFSET $offset";
    $result = $conn->query($sql);

    if ($result->num_rows === 0) {
        // No more emails to send
        break;
    }
    while ($row = $result->fetch_assoc()) {
        $email = $row['email'];
        // Send email
       // if (mail($email, $subject, $message, $headers)) {
     //       echo "Email sent to: $email\n";
     //   } else {
      //      echo "Failed to send email to: $email\n";
      //  }
        echo $i."Email sent to: $email\n </br>";
        $i++;
    }

    // Increment the offset for the next batch
    $offset += $batchSize;

    // Optional: Pause to avoid server overload
    usleep(200000); // Sleep for 0.2 seconds (adjust as needed)
}

$conn->close();
?>
