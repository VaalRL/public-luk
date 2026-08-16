import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button Component', () => {
    describe('Rendering', () => {
        it('should render button with text', () => {
            render(<Button>Click me</Button>);
            expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
        });

        it('should render with default variant', () => {
            render(<Button>Default</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('bg-primary');
        });

        it('should render with destructive variant', () => {
            render(<Button variant="destructive">Delete</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('bg-destructive');
        });

        it('should render with outline variant', () => {
            render(<Button variant="outline">Outline</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('border');
        });

        it('should render with ghost variant', () => {
            render(<Button variant="ghost">Ghost</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('hover:bg-accent');
        });

        it('should render with link variant', () => {
            render(<Button variant="link">Link</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('underline-offset-4');
        });
    });

    describe('Sizes', () => {
        it('should render with default size', () => {
            render(<Button>Default Size</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('h-9');
        });

        it('should render with small size', () => {
            render(<Button size="sm">Small</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('h-8');
        });

        it('should render with large size', () => {
            render(<Button size="lg">Large</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('h-10');
        });

        it('should render as icon button', () => {
            render(<Button size="icon">🔍</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('size-9');
        });
    });

    describe('States', () => {
        it('should be disabled when disabled prop is true', () => {
            render(<Button disabled>Disabled</Button>);
            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
            expect(button).toHaveClass('disabled:opacity-50');
        });

        it('should not be clickable when disabled', async () => {
            const handleClick = vi.fn();
            render(<Button disabled onClick={handleClick}>Disabled</Button>);

            const button = screen.getByRole('button');
            await userEvent.click(button);

            expect(handleClick).not.toHaveBeenCalled();
        });
    });

    describe('Interactions', () => {
        it('should call onClick handler when clicked', async () => {
            const handleClick = vi.fn();
            render(<Button onClick={handleClick}>Click me</Button>);

            const button = screen.getByRole('button');
            await userEvent.click(button);

            expect(handleClick).toHaveBeenCalledTimes(1);
        });

        it('should support keyboard interaction', async () => {
            const handleClick = vi.fn();
            render(<Button onClick={handleClick}>Press me</Button>);

            const button = screen.getByRole('button');
            button.focus();
            await userEvent.keyboard('{Enter}');

            expect(handleClick).toHaveBeenCalledTimes(1);
        });
    });

    describe('Custom Props', () => {
        it('should accept custom className', () => {
            render(<Button className="custom-class">Custom</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('custom-class');
        });

        it('should accept type prop', () => {
            render(<Button type="submit">Submit</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('type', 'submit');
        });

        it('should accept aria-label', () => {
            render(<Button aria-label="Close dialog">×</Button>);
            const button = screen.getByRole('button', { name: 'Close dialog' });
            expect(button).toBeInTheDocument();
        });

        it('should accept data attributes', () => {
            render(<Button data-testid="my-button">Test</Button>);
            const button = screen.getByTestId('my-button');
            expect(button).toBeInTheDocument();
        });
    });

    describe('asChild Prop', () => {
        it('should render as child component when asChild is true', () => {
            render(
                <Button asChild>
                    <a href="/test">Link Button</a>
                </Button>
            );

            const link = screen.getByRole('link', { name: 'Link Button' });
            expect(link).toBeInTheDocument();
            expect(link).toHaveAttribute('href', '/test');
        });
    });
});
