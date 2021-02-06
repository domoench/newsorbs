export default class CircularBufferIndex {
  constructor(startIndex, size) {
    this.index = startIndex;
    this.size = size;
  }

  get() {
    return this.index;
  }

  decrement() {
    if (this.index === 0) {
      this.index = this.size - 1;
    } else {
      this.index--;
    }
  }

  increment() {
    if (this.index === this.size) {
      this.index = 0;
    } else {
      this.index++;
    }
  }
}
