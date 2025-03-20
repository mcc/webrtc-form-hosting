const baseUrl = location.origin;

// Fetch TURN credentials from the server
async function getTurnCredentials() {
  const response = await fetch(`${baseUrl}/api/turn`);
  if (!response.ok) throw new Error('Failed to fetch TURN credentials');
  return await response.json(); // Returns iceServers array
}

// Host logic
async function startHosting() {
  const roomId = document.getElementById('roomId').value;
  const receivedDataDiv = document.getElementById('receivedData');

  // Get TURN credentials
  const iceServers = await getTurnCredentials();
  const pc = new RTCPeerConnection({ iceServers });

  const dataChannel = pc.createDataChannel('formData');
  dataChannel.onopen = () => {
    console.log('Data channel opened');
    receivedDataDiv.innerText = 'Connected, waiting for form data...';
  };
  dataChannel.onmessage = (event) => {
    console.log('Received data:', event.data);
    receivedDataDiv.innerText = 'Received: ' + event.data;
  };

  // Collect ICE candidates and send offer
  pc.onicecandidate = async (event) => {
    if (!event.candidate) { // When ICE gathering is complete
      console.log('ICE gathering complete, sending offer');
      const offer = pc.localDescription;
      await fetch(`${baseUrl}/api/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, offer }),
      });
      console.log('Offer sent for room:', roomId);
    }
  };

  // Create and set offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Poll for answer with retry and timeout
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds timeout
  const checkAnswer = setInterval(async () => {
    attempts++;
    const response = await fetch(`${baseUrl}/api/answer?roomId=${roomId}`);
    console.log(`Checking for answer (attempt ${attempts})...`);

    if (response.ok) {
      const answer = await response.json();
      console.log('Answer received:', answer);
      await pc.setRemoteDescription(answer);
      clearInterval(checkAnswer);
      receivedDataDiv.innerText = 'Connected, waiting for form data...';
    } else if (attempts >= maxAttempts) {
      clearInterval(checkAnswer);
      receivedDataDiv.innerText = 'Error: No answer received after timeout.';
      console.error('Timeout: No answer found after', maxAttempts, 'attempts');
    }
  }, 1000);
}

// Submitter logic
async function submitForm() {
  const roomId = document.getElementById('submitRoomId').value;
  const formData = document.getElementById('formData').value;

  // Get TURN credentials
  const iceServers = await getTurnCredentials();
  const pc = new RTCPeerConnection({ iceServers });

  // Collect ICE candidates and send answer
  pc.onicecandidate = async (event) => {
    if (!event.candidate) { // When ICE gathering is complete
      console.log('ICE gathering complete, sending answer');
      const answer = pc.localDescription;
      await fetch(`${baseUrl}/api/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, answer }),
      });
      console.log('Answer sent for room:', roomId);
    }
  };

  pc.ondatachannel = (event) => {
    const dataChannel = event.channel;
    dataChannel.onopen = () => {
      console.log('Data channel opened, sending form data');
      dataChannel.send(formData);
    };
  };

  // Fetch offer and set it
  const response = await fetch(`${baseUrl}/api/offer?roomId=${roomId}`);
  if (response.ok) {
    const offer = await response.json();
    console.log('Offer received:', offer);
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
  } else {
    console.error('Failed to fetch offer:', response.statusText);
    alert('No offer found for this room ID.');
  }
}