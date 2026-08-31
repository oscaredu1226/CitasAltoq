import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let fixture: ComponentFixture<PaginationComponent<unknown>>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PaginationComponent],
    });

    fixture = TestBed.createComponent(PaginationComponent<unknown>);
  });

  it('shows page numbers with ellipsis for long paginated lists', () => {
    fixture.componentRef.setInput('page', {
      content: [],
      page: 4,
      size: 10,
      totalElements: 120,
      totalPages: 12,
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('1');
    expect(text).toContain('4');
    expect(text).toContain('5');
    expect(text).toContain('6');
    expect(text).toContain('12');
    expect(text).toContain('...');
  });

  it('emits the selected zero-based page', () => {
    const spy = vi.fn();
    fixture.componentInstance.goTo.subscribe(spy);
    fixture.componentRef.setInput('page', {
      content: [],
      page: 0,
      size: 10,
      totalElements: 30,
      totalPages: 3,
    });
    fixture.detectChanges();

    fixture.nativeElement.querySelectorAll('.pagination__page')[1].click();

    expect(spy).toHaveBeenCalledWith(1);
  });
});
