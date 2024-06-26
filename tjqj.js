const express = require('express');
const multer = require('multer');
const path = require('path');
const Tesseract = require('tesseract.js');
const fs = require('fs'); // 파일 시스템 모듈 추가

const app = express();

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// // 파일 업로드를 위한 multer 설정
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 } // 1MB 제한
}).single('studentCard');

// OCR을 사용하여 학번 추출
function extractStudentID(imagePath) {
    return new Promise((resolve, reject) => {
        Tesseract.recognize(
            imagePath,
            'eng',
            { logger: m => console.log(m) } // Optional logger callback
        ).then(({ data: { text } }) => {
            // 추출된 텍스트에서 9자리 숫자만 추출
            const studentID = extractNumbersFromText(text);
            resolve(studentID);
        }).catch(error => {
            reject(error);
        });
    });
}

// OCR으로부터 추출된 텍스트에서 9자리 숫자만 추출하는 함수
function extractNumbersFromText(text) {
    const numberPattern = /\b\d{9}\b/g; // 9자리 숫자를 추출하는 정규식
    const numbers = text.match(numberPattern);
    return numbers ? numbers.join('') : null;
}

// 회원가입 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html')); // public 안에 signup.html이 있어서 코드를 수정함
});

// 회원가입 양식 제출 처리
app.post('/', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).send('파일 업로드 실패');
        }

        const imagePath = req.file.path;
        const username = req.body.username;

        // 아이디가 숫자 9자리인지 검증
        if (!/^\d{9}$/.test(username)) {
            return res.status(400).send('학번은 숫자 9자리로 입력해야 합니다.');
        }

        const studentID = await extractStudentID(imagePath);

        // 아이디와 학번이 일치하는지 확인
        if (username && studentID && username === studentID) {
            // 여기에서 회원가입 로직을 추가합니다.
            // 성공 메시지를 보냅니다.
            res.send('본인인증 성공!');
        } else {
            res.status(400).send('학번이 일치하지 않습니다.');
        }
    });
});


// 자신이 녹음한 음원을 추출하여 puploads 폴더에 저장
// 파일 업로드를 위한 multer 설정
const storage_1 = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadPath = path.join(__dirname, 'puploads');
        // puploads 폴더가 없으면 생성
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath); // puploads 폴더에 저장
    },
    filename: function(req, file, cb) {
        cb(null, 'recording-' + Date.now() + path.extname(file.originalname)); // 파일 이름 설정
    }
});

const upload_1 = multer({ storage: storage_1 });

// 파일 업로드 처리 라우트
app.post('/upload', upload_1.single('audio'), (req, res) => {
    // 파일 업로드 완료 후 처리할 로직 추가
    res.send('File uploaded successfully.');
});


// 가장 최근의 MP3 가져오기
// puploads 폴더 경로
const puploadsFolder = path.join(__dirname, 'puploads');

// 가장 최근에 저장된 mp3 파일 경로 가져오기
function getLatestMP3FilePath() {
  const files = fs.readdirSync(puploadsFolder);
  let latestFile;
  let latestTime = 0;

  files.forEach(file => {
    const filePath = path.join(puploadsFolder, file);
    const stats = fs.statSync(filePath);
    const mtime = stats.mtime.getTime();

    if (mtime > latestTime && file.endsWith('.mp3')) {
      latestTime = mtime;
      latestFile = filePath;
    }
  });

  return latestFile;
}

// puploads에 저장된 가장 최근 mp3 파일 제공
app.get('/latest-mp3', (req, res) => {
  const latestMP3FilePath = getLatestMP3FilePath();

  if (latestMP3FilePath) {
    // 파일을 스트림으로 읽어 클라이언트에게 전송
    const stream = fs.createReadStream(latestMP3FilePath);
    stream.pipe(res);
  } else {
    res.status(404).send('No MP3 file found');
  }
});


// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});