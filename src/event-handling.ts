type Handler<E> = (event: E) => void;

class EventDispatcher<E> {
  private handlers: Handler<E>[] = [];
  fire(event: E): void {
    for (const h of this.handlers) {
      h(event);
    }
  }
  register(handler: Handler<E>): void {
    this.handlers.push(handler);
  }
}

export { Handler, EventDispatcher };
