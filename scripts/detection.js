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

const MUSIC_URL = "../sounds/sin_wave_with_cut.wav";

const THRESHOLD_WINDOW_SIZE = 10;
const MULTIPLIER            = 1.5;
const SAMPLE_SIZE           = 1024;
const FFT2SIZE              = 1024;

var audioContext = null;
var isPlaying = false;
var sourceNode = null;
var theBuffer = null;
var detectorElem;
var errorString = "";

/*
Frequency is the frequency of the note in hertz
start_time is the time in samples where the note started in the piece
end_time i the the time in samples where the note ended in the piece
*/
function Note(frequency, start_time){
	this.freq = frequency;
	this.start = start_time;
	this.end = null;
	this.setEnd = function(end_time) {
		this.end = end_time;
	};
	this.durationTime = function(sample_rate){
		return (this.end - this.start) / sample_rate;
	};
}



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
};

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
        return "start";
    }

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = theBuffer;
    sourceNode.loop = false;

    analyser = audioContext.createAnalyser();
    sourceNode.connect( audioContext.destination );
		/*
		sourceNode.onended = function(event){
			isPlaying = false;
			main();
		}
		*/

    sourceNode.start( 0 );
    isPlaying = true;
    isLiveInput = false;

		main();

    return "stop";
}

function main(){
	var rootMeanSquare = [];
	var peaks        = [];
	var threshold    = [];
	var spectralFlux = [];
	var buffer = theBuffer.getChannelData(0);
	var norm_buffer = Array.prototype.slice.call(buffer);
	var notes_played = [];
	var pitch_samples = null;
	var ac = null;
	var newest_note = null;

	find_onsets(buffer, spectralFlux, threshold, peaks, rootMeanSquare);
	var noteOn = false;


	for (let i = 0; i < peaks.length; i += 1) {
		//document.getElementById("checker").innerHTML = "At " + i + " the peak value is " + peaks[i] + " and the RMS value is " + rootMeanSquare[i];
		if(peaks[i] != 0 && noteOn == false){
			//pass next 1024 samples to pitch_detect
			pitch_samples = buffer.slice(i*SAMPLE_SIZE, Math.min(buffer.length, i*SAMPLE_SIZE + SAMPLE_SIZE));
			ac = autoCorrelate( pitch_samples, audioContext.sampleRate );
			notes_played.push(new Note(Math.round(ac), i*1024));
			noteOn = true;
		} else if(peaks[i] != 0 && noteOn == true){
			if(rootMeanSquare[i] < 0.3){
				noteOn = false;
				notes_played[notes_played.length - 1].setEnd(i*1024);
				//add where note stopped ot last note instance
			} else{
				//add where note stoped t the last note instance
				notes_played[notes_played.length - 1].setEnd(i*1024);
				//pass next 1024 samples to pitch detecto
				pitch_samples = buffer.slice(i*SAMPLE_SIZE, Math.min(buffer.length, i*SAMPLE_SIZE + SAMPLE_SIZE));
				ac = autoCorrelate( pitch_samples, audioContext.sampleRate );
				notes_played.push(new Note(Math.round(ac), i*1024));
			}
		} else if(rootMeanSquare[i] < 0.3 && noteOn == true){
			noteOn = false;
			notes_played[notes_played.length - 1].setEnd(i*1024);
		}
	}


/*
	var splitSamples = [];
	let table = document.getElementById("notesPlayed");
	for (let j = 0; j < buffer.length; j += SAMPLE_SIZE) {
		splitSamples.push(buffer.slice(j, j + SAMPLE_SIZE));
	}
	for (let i = 24; i < splitSamples.length; i++) {
		// Samples must fill the full size to ensure a power of two for the FFT
		if (splitSamples[i].length !== SAMPLE_SIZE) break;
		pitch_sample = Float32Array.from(splitSamples[i]);
		ac = autoCorrelate(pitch_samples, audioContext.sampleRate);
		var row = table.insertRow();
		var cell1 = row.insertCell(0);
		var cell2 = row.insertCell(1);
		cell1.innerHTML = i;
		cell2.innerHTML = ac;
	}
	*/

	let table = document.getElementById("notesPlayed");
	for(let j = 0; j < notes_played.length; j += 1){
		var row = table.insertRow();
		var cell1 = row.insertCell(0);
		var cell2 = row.insertCell(1);
		var cell3 = row.insertCell(2);
		cell1.innerHTML = notes_played[j].freq;
		cell2.innerHTML = notes_played[j].start;
		cell3.innerHTML = notes_played[j].durationTime(audioContext.sampleRate);
	}


	/*
	let table = document.getElementById("notesPlayed");
	for(let j = 0; j < rootMeanSquare.length; j += 1){
		var row = table.insertRow();
		var cell1 = row.insertCell(0);
		var cell2 = row.insertCell(1);
		var cell3 = row.insertCell(2);
		cell1.innerHTML = j;
		cell2.innerHTML = peaks[j];
		cell3.innerHTML = rootMeanSquare[j];
	}
	*/
}

function autoCorrelate( buf, sampleRate ) {
	var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.
	var GOOD_ENOUGH_CORRELATION = 0.9; // this is the "bar" for how close a correlation needs to be
	var SIZE = buf.length;
	var MAX_SAMPLES = Math.floor(SIZE/2);
	var best_offset = -1;
	var best_correlation = 0;
	var rms = 0;
	var foundGoodCorrelation = false;
	var correlations = new Array(MAX_SAMPLES);

	for (let i=0;i<SIZE;i++) {
		var val = buf[i];
		rms += val*val;
	}
	rms = Math.sqrt(rms/SIZE);
	errorString += " " + buf.length;
	//document.getElementById("checker").innerHTML = errorString;
	if (rms<0.01) // not enough signal
		return -1;

	var lastCorrelation=1;
	for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
		var correlation = 0;

		for (let i=0; i<MAX_SAMPLES; i++) {
			correlation += Math.abs((buf[i])-(buf[i+offset]));
		}
		correlation = 1 - (correlation/MAX_SAMPLES);
		correlations[offset] = correlation; // store it, for the tweaking we need to do below.
		if ((correlation>GOOD_ENOUGH_CORRELATION) && (correlation > lastCorrelation)) {
			foundGoodCorrelation = true;
			if (correlation > best_correlation) {
				best_correlation = correlation;
				best_offset = offset;
			}
		} else if (foundGoodCorrelation) {
			// short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
			// Now we need to tweak the offset - by interpolating between the values to the left and right of the
			// best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
			// we need to do a curve fit on correlations[] around best_offset in order to better determine precise
			// (anti-aliased) offset.

			// we know best_offset >=1,
			// since foundGoodCorrelation cannot go to true until the second pass (offset=1), and
			// we can't drop into this clause until the following pass (else if).
			var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];
			return sampleRate/(best_offset+(8*shift));
		}
		lastCorrelation = correlation;
	}
	if (best_correlation > 0.01) {
		// console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
		return sampleRate/best_offset;
	}
	//errorString += "f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")";
	//document.getElementById("checker").innerHTML = errorString
	return -1;
//	var best_frequency = sampleRate/best_offset;
}

function find_onsets(bufferSamples, spectralFlux, threshold, peaks, rootMeanSquare) {

	var fft  = new FFT(SAMPLE_SIZE, 44100);
	var fft2 = new FFT(FFT2SIZE,    44100 / SAMPLE_SIZE);
	var spectrum     = new Float32Array(SAMPLE_SIZE / 2);
	var prevSpectrum = new Float32Array(SAMPLE_SIZE / 2);
	var prunnedSpectralFlux = [];
	var splitSamples = [];



	// Split samples into arrays of 1024
	for (let i = 0; i < bufferSamples.length; i += SAMPLE_SIZE) {
		splitSamples.push(bufferSamples.slice(i, i + SAMPLE_SIZE));
	}

	// Calculate a spectral flux value for each sample range in the song
	for (let i = 0; i < splitSamples.length; i++) {
		// Samples must fill the full size to ensure a power of two for the FFT
		if (splitSamples[i].length !== SAMPLE_SIZE) break;

		//calculate the RMS for given window
		rootMeanSquare.push(DSP.RMS(splitSamples[i]));
		//TODO Implement a Schmitt Trigger on the RMS signal to get onset

		// Copy the current spectrum values into the previous
		for (let j = 0; j < spectrum.length; j++) {
			prevSpectrum[j] = spectrum[j];
		}
		// Update the current spectrum with the FFT bins for this sample range
		fft.forward(splitSamples[i]);
		spectrum = fft.spectrum;

		// Spectral flux is the sum of all increasing (positive) differences in each bin and its corresponding bin from the previous sample
		var flux = 0;


		// Caring only about rising matching bin deltas between this and the previous spectrum, sum all positive deltas to calculate total flux
		for (let bin = 0; bin < spectrum.length; bin++) {
			//flux += Math.max(0, spectrum[bin] - prevSpectrum[bin]);
			flux += Math.abs(spectrum[bin]-prevSpectrum[bin]); //trying absolute value to capture increases and decreases in energy
		}

		// Save the calculated flux for this sample range
		spectralFlux.push(flux);
	}

	// Calculate threshold values by averaging the range of flux values
	for (let i = 0; i < spectralFlux.length; i++) {
		// Determine the start and end indexes of the spectral flux for this iteration's window range
		var start = Math.max(0, i - THRESHOLD_WINDOW_SIZE);
		var end = Math.min(spectralFlux.length - 1, i + THRESHOLD_WINDOW_SIZE);

		// Sum all the spectral flux values in this range
		var sum = 0;
		for (let flux = start; flux <= end; flux++) {
			sum += spectralFlux[flux];
		}

		// Save the calculated threshold value for this averaging window range
		threshold.push(sum / (end - start) * MULTIPLIER);
	}

	// Calculate pruned flux values where the spectral flux exceeds the averaged threshold
	for (let i = 0; i < threshold.length; i++) {
		// Save either zero or the difference from threshold to flux if positive
		prunnedSpectralFlux.push(Math.max(0, spectralFlux[i] - threshold[i]));
	}

	// Remove all but the peaks of pruned spectral flux values, setting all else to zero
	for (let i = 0; i < prunnedSpectralFlux.length - 1; i++) {
		if (prunnedSpectralFlux[i] > prunnedSpectralFlux[i + 1]) {
			// This is higher than the next value, so save it
			peaks.push(prunnedSpectralFlux[i]);
		} else {
			// This is lower than the next value, so drop it to zero
			peaks.push(0);
		}
	}
	for (let i = peaks.length-1; i > 0; i--){
		if (peaks[i] < peaks[i-1] || peaks[i] < .5){
			peaks[i] = 0;
		}
	}
}
