/*
Frequency is the frequency of the note in hertz
start_time is the time in samples where the note started in the piece
end_time i the the time in samples where the note ended in the piece
*/
class Note {

  constructor(frequency, start_time, end_time) = {
    this.freq = frequency;

    if (start_time === undefined){
      this.start = null;
    } else {
      this.start = start_time;
    }

    if(end_time === undefined) {
      this.end = null;
    } else{
      this.end = end_time;
    }
  }

  //Setters
  set_frequency(frequency){
    this.freq = frequency;
  }

  set_start(start_time) {
    this.start = start_time;
  }

  set_end(end_time) {
    this.end = end_time;
  }

  //returns how long the note lasted in seconds
  duration_time(samplerate) {
    return (end - start) / samplerate;
  }

  duration_samples() {
    return end - start;
  }
}
