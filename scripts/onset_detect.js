function find_onsets(samples, spectralflux, threshold, peaks, rootMeanSquare) {
	var buffer;


	// Get a buffer of samples from the left channel
	var bufferSamples = samples.getChannelData(0);

	const THRESHOLD_WINDOW_SIZE = 10;
	const MULTIPLIER            = 1.5;
	const SAMPLE_SIZE           = 1024;
	const FFT2SIZE              = 1024;

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

	source.connect(context.destination);
	source.buffer = samples;
	source.start();
	startTime = context.currentTime;

	visualize(bufferSamples, spectralFlux, threshold, peaks, peakFreq, rootMeanSquare);
}
