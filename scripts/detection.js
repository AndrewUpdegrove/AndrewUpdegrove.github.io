/*
The MIT License (MIT)
Copyright (c) 2014 Chris Wilson
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

window.AudioContext = window.AudioContext || window.webkitAudioContext;

const MUSIC_URL = "../sounds/SoundBible-whistling.mp3"

var audioContext = null;
var isPlaying = false;
var sourceNode = null;
var analyser = null;
var theBuffer = null;
var mediaStreamSource = null;
var currNoteArray = [];
var detectorElem,
	canvasElem,
	waveCanvas,
	pitchElem,
	noteElem,
	detuneElem,
	detuneAmount;

window.onload = function() {
	audioContext = new AudioContext();
	MAX_SIZE = Math.max(4,Math.floor(audioContext.sampleRate/5000));	// corresponds to a 5kHz signal
	loadTrack(MUSIC_URL, function(buffer) {
		theBuffer = buffer;
	});

	detectorElem = document.getElementById( "detector" );
	canvasElem = document.getElementById( "output" );
	pitchElem = document.getElementById( "pitch" );
	noteElem = document.getElementById( "note" );
	detuneElem = document.getElementById( "detune" );
	detuneAmount = document.getElementById( "detune_amt" );

	detectorElem.ondragenter = function () {
		this.classList.add("droptarget");
		return false; };
	detectorElem.ondragleave = function () { this.classList.remove("droptarget"); return false; };
	detectorElem.ondrop = function (e) {
  		this.classList.remove("droptarget");
  		e.preventDefault();
		theBuffer = null;

	  	var reader = new FileReader();
	  	reader.onload = function (event) {
	  		audioContext.decodeAudioData( event.target.result, function(buffer) {
	    		theBuffer = buffer;
	  		}, function(){alert("error loading!");} );

	  	};
	  	reader.onerror = function (event) {
	  		alert("Error: " + reader.error );
		};
	  	reader.readAsArrayBuffer(e.dataTransfer.files[0]);
	  	return false;
	};



}

function error() {
    alert('Stream generation failed.');
}

function loadTrack(url, callback) {
	var request = new XMLHttpRequest();
	request.open("GET", url, true);
	request.responseType = "arraybuffer";
	request.onload = function() {
		audioContext.decodeAudioData(request.response, callback);
	};
	request.send();
}

function togglePlayback() {
    if (isPlaying) {
        //stop playing and return
        sourceNode.stop( 0 );
        sourceNode = null;
        analyser = null;
        isPlaying = false;

				//write out the notes that were recorded
				var toScreen = "";
				for (var i = 0; i < currNoteArray.length; i ++){
					toScreen += currNoteArray[i] + " -> ";
				}
				document.getElementById( "notesPlayed" ).innerHTML = toScreen;
				currNoteArray = [];

				if (!window.cancelAnimationFrame)
					window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
        window.cancelAnimationFrame( rafID );
        return "start";
    }

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = theBuffer;
    sourceNode.loop = False;

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    sourceNode.connect( analyser );
    analyser.connect( audioContext.destination );
    sourceNode.start( 0 );
    isPlaying = true;
    isLiveInput = false;
		main();

		//write out the notes that were recorded
		var toScreen = "";
		for (var i = 0; i < currNoteArray.length; i ++){
			toScreen += currNoteArray[i] + " 0->";
		}
		document.getElementById( "notesPlayed" ).innerHTML = toScreen;
		currNoteArray = [];

    return "stop";
}

function main(){
	var rootMeanSquare = [];
	var peaks        = [];
	var threshold    = [];
	var spectralFlux = [];
	var buffer = samples.getChannelData(0);

	find_onsets(buffer, spectralflux, threshold, peaks, rootMeanSquare)

	var noteOn = false;

	for (let i = 0; i < peaks.length; i += 1) {
		if(peaks[i] != 0 && noteOn == false){
			//pass next 1024 samples to pitch_detect
			//create a new Note instance
			noteOn = true;
		} else if(peaks[i] != 0 && noteOn == true){
			if(rootMeanSquare[i] < .3){
				noteOn = false;
				//add where note stopped ot last note instance
			} else {
				//add where note stoped t the last note instance
				//pass next 1024 samples to pitch detecto
				//reate a new note instance
			}
		} else if(rootMenaSquare[i] < .3){
			noteOn = fale;
			//add where note stoped t the last note instance
		}
	}
}
