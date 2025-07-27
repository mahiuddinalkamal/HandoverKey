import { render } from '@testing-library/react';

// Simple smoke test to ensure the test setup is working
describe('App Test Setup', () => {
  it('should be able to render a simple component', () => {
    const TestComponent = () => <div data-testid="test">Hello World</div>;
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('test')).toBeInTheDocument();
  });

  it('should handle basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toBe('hello');
    expect(true).toBeTruthy();
  });
});