const baseUrl = location.origin; // Pages URL serves both static content and API

// Host logic
async function startHosting() {
  const roomId = document.getElementById('roomId').value;
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'turn:turn.cloudflare.com:3478' } // Add credentials if needed
    ]
  });
  const dataChannel = pc.createDataChannel('formData');

  dataChannel.onopen = () => console.log('Data channel opened');
  dataChannel.onmessage = (event) => {
    document.getElementById('receivedData').innerText = 'Received: ' + event.data;
  };

  pc.onicecandidate = async (event) => {
    if (event.candidate) return; // Simplified
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await fetch(`${baseUrl}/api/offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, offer })
    });
  };

  // Poll for answer
  const checkAnswer = setInterval(async () => {
    const response = await fetch(`${baseUrl}/api/answer?roomId=${roomId}`);
    if (response.ok) {
      const answer = await response.json();
      await pc.setRemoteDescription(answer);
      clearInterval(checkAnswer);
    }
  }, 1000);
}

// Submitter logic
async function submitForm() {
  const roomId = document.getElementById('submitRoomId').value;
  const formData = document.getElementById('formData').value;
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'turn:turn.cloudflare.com:3478' } // Add credentials if needed
    ]
  });

  pc.onicecandidate = async (event) => {
    if (event.candidate) return; // Simplified
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await fetch(`${baseUrl}/api/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, answer })
    });
  };

  pc.ondatachannel = (event) => {
    const dataChannel = event.channel;
    dataChannel.onopen = () => dataChannel.send(formData);
  };

  const response = await fetch(`${baseUrl}/api/offer?roomId=${roomId}`);
  if (response.ok) {
    const offer = await response.json();
    await pc.setRemoteDescription(offer);
    await pc.createAnswer();
  }
}