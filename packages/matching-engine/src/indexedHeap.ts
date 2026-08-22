import { Order } from "@trading/shared-types";

export class IndexedBinaryHeap {
  private heap: Order[] = [];
  private idToPosition: Map<string, number> = new Map();
  private isMinHeap: boolean;

  constructor(isMinHeap: boolean = true) {
    this.isMinHeap = isMinHeap;
  }

  /**
   * Compares two orders.
   * Returns a negative number if order A has HIGHER priority than B (should be closer to the top of the heap).
   * Returns a positive number if order B has HIGHER priority than A.
   */
  private compare(a: Order, b: Order): number {
    if (a.price !== b.price) {
      if (this.isMinHeap) {
        return a.price - b.price; // Min price at top
      } else {
        return b.price - a.price; // Max price at top
      }
    }
    // Price tie: older orders (smaller sequence numbers) have higher priority
    const seqA = a.sequenceNumber ?? 0;
    const seqB = b.sequenceNumber ?? 0;
    return seqA - seqB;
  }

  public size(): number {
    return this.heap.length;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  public peek(): Order | null {
    return this.heap[0] || null;
  }

  public insert(order: Order): void {
    if (this.idToPosition.has(order.id)) {
      throw new Error(`Order with ID ${order.id} already exists in the heap.`);
    }

    this.heap.push(order);
    const index = this.heap.length - 1;
    this.idToPosition.set(order.id, index);
    this.bubbleUp(index);
  }

  public poll(): Order | null {
    if (this.isEmpty()) return null;

    const top = this.heap[0];
    const last = this.heap.pop()!;
    this.idToPosition.delete(top.id);

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.idToPosition.set(last.id, 0);
      this.bubbleDown(0);
    }

    return top;
  }

  public remove(orderId: string): Order | null {
    const index = this.idToPosition.get(orderId);
    if (index === undefined) return null;

    const removedOrder = this.heap[index];
    const last = this.heap.pop()!;
    this.idToPosition.delete(orderId);

    if (index < this.heap.length) {
      this.heap[index] = last;
      this.idToPosition.set(last.id, index);
      this.bubbleUp(index);
      this.bubbleDown(index);
    }

    return removedOrder;
  }

  public updateQuantity(orderId: string, remainingQuantity: number): void {
    const index = this.idToPosition.get(orderId);
    if (index === undefined) {
      throw new Error(`Order with ID ${orderId} not found in the heap.`);
    }
    this.heap[index].remainingQuantity = remainingQuantity;
  }

  /**
   * Returns a copy of all orders in the heap, sorted in order of matching priority.
   */
  public getSortedValues(): Order[] {
    return [...this.heap].sort((a, b) => this.compare(a, b));
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) {
        break; // Node is in correct position
      }
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const len = this.heap.length;
    while (true) {
      let priorityIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < len && this.compare(this.heap[leftChild], this.heap[priorityIndex]) < 0) {
        priorityIndex = leftChild;
      }
      if (rightChild < len && this.compare(this.heap[rightChild], this.heap[priorityIndex]) < 0) {
        priorityIndex = rightChild;
      }

      if (priorityIndex === index) {
        break;
      }

      this.swap(index, priorityIndex);
      index = priorityIndex;
    }
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;

    this.idToPosition.set(this.heap[i].id, i);
    this.idToPosition.set(this.heap[j].id, j);
  }
}
