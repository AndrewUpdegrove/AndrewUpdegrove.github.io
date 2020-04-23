class Note {
  constructor(frequency, start_time){
    this.freq = frequency;
    this.start = start_time;
		this.end = null;
  }

  //Setters
  set freq(frequency){
    this.freq = frequency;
  }

  set start(start_time) {
    this.start = start_time;
  }

  set end(end_time){
    this.end = end_time;
  }

  get freq(){
    return this.freq;
  }

  get start(){
    return this.start;
  }

  get end(){
    return this.end;
  }

  //returns how long the note lasted in seconds
  duration_time(samplerate) {
    return (this.end - this.start) / samplerate;
  }

  duration_samples() {
    return this.end - this.start;
  }

  noteFromPitch() {
  	var noteNum = 12 * (Math.log( this.freq / 440 )/Math.log(2) );
  	return Math.round( noteNum ) + 69;
  }

  frequencyFromNoteNumber() {
  	return 440 * Math.pow(2,(this.noteFromPitch()-69)/12);
  }

  centsOffFromPitch() {
  	return Math.floor( 1200 * Math.log( this.freq / this.frequencyFromNoteNumber())/Math.log(2) );
  }
}
