/* eslint-disable quotes */
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Container, Box, Button, Typography, TextField } from "@mui/material";

const OPENAI_API_KEY = "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";

function initializeSpeechRecognition() {
  if (
    !window.SpeechRecognition &&
    !window.webkitSpeechRecognition &&
    !window.navigator.mediaDevices.getUserMedia
  ) {
    return null;
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  return new SpeechRecognition();
}

function App() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [audioURL, setAudioURL] = useState(null);
  const recognition = useRef(initializeSpeechRecognition());
  const mediaRecorder = useRef(null);
  const [selectedVoice, setSelectedVoice] = useState(null);

  const loadVoices = () => {
    const synth = window.speechSynthesis;

    const onVoicesChanged = () => {
      const voices = synth.getVoices();
      const desiredVoice = voices.find(
        (voice) => voice.name === "Google US English"
      );
      setSelectedVoice(desiredVoice);
      synth.removeEventListener("voiceschanged", onVoicesChanged);
    };

    if (synth.getVoices().length > 0) {
      onVoicesChanged();
    } else {
      synth.addEventListener("voiceschanged", onVoicesChanged);
    }
  };

  useEffect(() => {
    loadVoices();
  }, []);

  const speakResponse = (text) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    synth.speak(utterance);
  };

  if (recognition.current) {
    recognition.current.continuous = true;
    recognition.current.interimResults = true;

    recognition.current.onresult = (event) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };
  }

  const handlePlayResponse = () => {
    if (response) {
      speakResponse(response);
    }
  };

  const handleStartRecording = async () => {
    if (recognition.current) {
      recognition.current.start();
      setRecording(true);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.start();

      const recordedChunks = [];
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(recordedChunks, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
      };
    }
  };

  const handleStopRecording = () => {
    if (recognition.current && mediaRecorder.current) {
      recognition.current.stop();
      mediaRecorder.current.stop();
      setRecording(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const result = await axios.post(
        "https://api.openai.com/v1/engines/text-davinci-002/completions",
        {
          prompt: transcript,
          max_tokens: 150,
          n: 1,
          stop: null,
          temperature: 0.7,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
        }
      );

      setResponse(result.data.choices[0].text.trim());
    } catch (err) {
      console.error("Error making request to ChatGPT API:", err);
    }

    if (response) {
      speakResponse(response);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box mt={4} textAlign="center">
        <Typography variant="h4" mb={4}>
          React Voice Recorder & ChatGPT API
        </Typography>
        {recording ? (
          <Button
            variant="contained"
            color="secondary"
            onClick={handleStopRecording}
          >
            Stop Recording
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleStartRecording}
          >
            Start Recording
          </Button>
        )}
        <Typography variant="h6" mt={4}>
          Transcript
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={transcript}
          margin="normal"
          variant="outlined"
          InputProps={{
            readOnly: true,
          }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={!transcript || recording}
          mt={2}
        >
          Submit
        </Button>
        {response && (
          <>
            <Typography variant="h6" mt={4}>
              ChatGPT Response
            </Typography>
            <Box display="flex" alignItems="center">
              <TextField
                fullWidth
                multiline
                rows={4}
                value={response}
                margin="normal"
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handlePlayResponse}
                ml={2}
              >
                Play
              </Button>
            </Box>
          </>
        )}
        {audioURL && (
          <>
            <Typography variant="h6" mt={4}>
              Recorded Audio
            </Typography>
            <Box mt={2}>
              <audio controls src={audioURL} />
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
}

export default App;
