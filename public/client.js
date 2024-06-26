// 오디오 컨텍스트 생성
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// MediaStreamDestination 생성 (녹음을 위해 필요)
const destination = audioContext.createMediaStreamDestination();

// MediaRecorder 변수 선언
let mediaRecorder;
let recordedChunks = []; // 녹음된 청크를 저장할 배열

// 모든 오디오 요소를 MediaElementSource로 연결
const audioElements = document.querySelectorAll('audio');
audioElements.forEach(audio => {
  const track = audioContext.createMediaElementSource(audio);
  track.connect(audioContext.destination); // AudioContext의 기본 출력에 연결
  track.connect(destination); // MediaStreamDestination에도 연결 (녹음을 위해)
});

// 키보드 이벤트 처리 함수: 키를 누르면 해당 오디오 재생
const playSound = e => {
  // 오디오 컨텍스트가 'suspended' 상태인 경우 재개
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const audio = document.querySelector(`audio[data-key="${e.keyCode}"]`);
  const key = document.querySelector(`li[data-key="${e.keyCode}"]`);

  if (audio) {
    audio.currentTime = 0; // 재생 시간을 초기화하여 반복 재생 가능하게 설정
    audio.play(); // 오디오 재생
    key.classList.add("playing"); // 키 요소에 playing 클래스 추가 (스타일링을 위해)
  }
};

// CSS 트랜지션 종료 이벤트 처리 함수: 트랜지션 종료 후 playing 클래스 제거
const removeTransition = e => {
  if (e.propertyName === "transform") {
    e.target.classList.remove("playing");
  }
};

// 키보드 이벤트 리스너 등록: 키를 누르면 playSound 함수 실행
window.addEventListener("keydown", playSound);

// 피아노 키 요소들에 대해 CSS 트랜지션 종료 이벤트 리스너 등록
const pianoElList = document.querySelectorAll("li");
pianoElList.forEach(el => {
  el.addEventListener("transitionend", removeTransition);
});

// 녹음 기능 추가: 시작 버튼 클릭 시 녹음 시작, 종료 버튼 클릭 시 녹음 중지
const startRecordButton = document.getElementById("startRecord");
const stopRecordButton = document.getElementById("stopRecord");
const uploadButton = document.getElementById("uploadButton"); // 업로드 버튼 추가
uploadButton.style.color = '#CBC0D3'; // 텍스트 색상

startRecordButton.addEventListener("click", startRecording);
stopRecordButton.addEventListener("click", stopRecording);
uploadButton.addEventListener("click", uploadRecording); // 업로드 버튼 클릭 이벤트 추가

function startRecording() {
  // 오디오 컨텍스트가 'suspended' 상태인 경우 재개
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  recordedChunks = []; // 녹음된 데이터 청크를 초기화

  // MediaRecorder 생성
  try {
    mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: 'audio/webm' // WebM 형식으로 설정
    });
  } catch (e) {
    console.error('Failed to create MediaRecorder:', e);
    return;
  }

  mediaRecorder.start(); // 미디어 레코더 시작

  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) {
      recordedChunks.push(e.data); // 레코딩된 데이터를 배열에 추가
    }
  };

  // 녹음 완료 후 처리: Blob 생성 및 다운로드 링크 설정
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'audio/mp3' });
    const formData = new FormData();
    formData.append('audio', blob, 'recording.mp3'); // recording.webm 파일 이름으로 설정

    uploadButton.style.display = 'block'; // 업로드 버튼 표시
  };

  startRecordButton.disabled = true; // 시작 버튼 비활성화
  stopRecordButton.disabled = false; // 중지 버튼 활성화
}

function stopRecording() {
  mediaRecorder.stop(); // 레코딩 중지
  startRecordButton.disabled = false; // 시작 버튼 활성화
  stopRecordButton.disabled = true; // 중지 버튼 비활성화
}

function uploadRecording() {
  const blob = new Blob(recordedChunks, { type: 'audio/mp3' });
  const formData = new FormData();
  formData.append('audio', blob, 'recording.mp3'); // recording.webm 파일 이름으로 설정

  fetch('/upload', {
    method: 'POST',
    body: formData
  })
  .then(response => response.text())
  .then(fileName => {
    console.log('Upload complete:', fileName);
  })
  .catch(error => console.error('Error uploading file:', error));
}

// 오디오 컨텍스트 재개 설정: 페이지 어느 곳이든 클릭 시 실행
document.body.addEventListener('click', () => {
  if (audioContext.state === 'suspended') {
    audioContext.resume(); // 오디오 컨텍스트 재개
  }
});
