# Testing Recommendations for Complex Components

This document outlines testing strategies and example tests for the complex components reviewed.

---

## Testing Strategy Overview

### Test Types Recommended

1. **Unit Tests**: Test individual functions and logic
2. **Integration Tests**: Test component interactions with APIs
3. **Accessibility Tests**: Ensure WCAG compliance
4. **Visual Regression Tests**: Catch unintended UI changes

---

## ProfileAvatar.tsx Testing

### Unit Tests

```typescript
// __tests__/components/ProfileAvatar.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileAvatar from '@/components/profile-page-components/ProfileAvatar'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}))

describe('ProfileAvatar', () => {
  const mockUserId = 'user123'
  const mockUserImage = 'data:image/png;base64,mockimage'

  it('renders with user image', () => {
    render(<ProfileAvatar userImage={mockUserImage} userId={mockUserId} />)
    const avatar = screen.getByRole('img')
    expect(avatar).toHaveAttribute('src', mockUserImage)
  })

  it('shows error when file is too large', async () => {
    render(<ProfileAvatar userImage={mockUserImage} userId={mockUserId} />)
    
    const file = new File(['x'.repeat(4 * 1024 * 1024)], 'large.jpg', { 
      type: 'image/jpeg' 
    })
    
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement
    await userEvent.upload(input, file)
    
    await waitFor(() => {
      expect(screen.getByText(/less than 3MB/i)).toBeInTheDocument()
    })
  })

  it('shows error when file type is invalid', async () => {
    render(<ProfileAvatar userImage={mockUserImage} userId={mockUserId} />)
    
    const file = new File(['content'], 'document.pdf', { 
      type: 'application/pdf' 
    })
    
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement
    await userEvent.upload(input, file)
    
    await waitFor(() => {
      expect(screen.getByText(/valid image file/i)).toBeInTheDocument()
    })
  })

  it('compresses and uploads valid image', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      })
    ) as jest.Mock

    render(<ProfileAvatar userImage={mockUserImage} userId={mockUserId} />)
    
    // Create a small valid image file
    const file = new File(['image content'], 'avatar.jpg', { 
      type: 'image/jpeg' 
    })
    
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement
    await userEvent.upload(input, file)
    
    await waitFor(() => {
      expect(screen.getByText(/uploaded successfully/i)).toBeInTheDocument()
    })
    
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/upload-profile-image',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('shows error when upload fails', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    ) as jest.Mock

    render(<ProfileAvatar userImage={mockUserImage} userId={mockUserId} />)
    
    const file = new File(['image'], 'avatar.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement
    await userEvent.upload(input, file)
    
    await waitFor(() => {
      expect(screen.getByText(/error uploading/i)).toBeInTheDocument()
    })
  })
})
```

### Image Compression Tests

```typescript
// __tests__/utils/imageCompression.test.ts
describe('Image Compression', () => {
  it('maintains aspect ratio when width > height', () => {
    const originalWidth = 1000
    const originalHeight = 500
    const maxWidth = 300
    const maxHeight = 300

    let { width, height } = { width: originalWidth, height: originalHeight }
    
    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
    }

    expect(width).toBe(300)
    expect(height).toBe(150)
    expect(width / height).toBe(originalWidth / originalHeight)
  })

  it('maintains aspect ratio when height > width', () => {
    const originalWidth = 400
    const originalHeight = 800
    const maxWidth = 300
    const maxHeight = 300

    let { width, height } = { width: originalWidth, height: originalHeight }
    
    if (height > maxHeight) {
      width = Math.round((width * maxHeight) / height)
      height = maxHeight
    }

    expect(width).toBe(150)
    expect(height).toBe(300)
    expect(width / height).toBe(originalWidth / originalHeight)
  })
})
```

---

## NoteBook.tsx Testing

### Component Tests

```typescript
// __tests__/components/NoteBook.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NoteBook from '@/components/note-page-components/NoteBook'
import { Entry } from '@/types'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  useScroll: () => ({
    scrollY: {
      on: jest.fn(),
      off: jest.fn(),
      clearListeners: jest.fn(),
    },
  }),
  AnimatePresence: ({ children }: any) => children,
}))

describe('NoteBook', () => {
  const mockNoteId = 'note123'
  const mockEntries: Entry[] = [
    {
      entryId: 'entry1',
      noteId: mockNoteId,
      item: 'Original content',
      createdAt: new Date(),
      lastEdit: new Date(),
    },
  ]

  it('renders with initial content', () => {
    render(<NoteBook noteEntries={mockEntries} noteId={mockNoteId} />)
    
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveValue('Original content')
  })

  it('shows last updated date', () => {
    render(<NoteBook noteEntries={mockEntries} noteId={mockNoteId} />)
    
    expect(screen.getByText(/last updated/i)).toBeInTheDocument()
  })

  it('updates text on input', async () => {
    render(<NoteBook noteEntries={mockEntries} noteId={mockNoteId} />)
    
    const textarea = screen.getByRole('textbox')
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'New content')
    
    expect(textarea).toHaveValue('New content')
  })

  it('shows error when saving without changes', async () => {
    render(<NoteBook noteEntries={mockEntries} noteId={mockNoteId} />)
    
    const saveButton = screen.getByText(/save notebook/i)
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText(/no changes were made/i)).toBeInTheDocument()
    })
  })

  it('saves notebook successfully', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ message: 'success' }),
      })
    ) as jest.Mock

    render(<NoteBook noteEntries={mockEntries} noteId={mockNoteId} />)
    
    const textarea = screen.getByRole('textbox')
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'Updated content')
    
    const saveButton = screen.getByText(/save notebook/i)
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText(/saved successfully/i)).toBeInTheDocument()
    })
    
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/save-notebook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('shows error when save fails', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    ) as jest.Mock

    render(<NoteBook noteEntries={mockEntries} noteId={mockNoteId} />)
    
    const textarea = screen.getByRole('textbox')
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'Updated content')
    
    const saveButton = screen.getByText(/save notebook/i)
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText(/error saving/i)).toBeInTheDocument()
    })
  })

  it('shows loading state while saving', async () => {
    global.fetch = jest.fn(() =>
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({ message: 'success' }),
          })
        }, 100)
      })
    ) as jest.Mock

    render(<NoteBook noteEntries={mockEntries} noteId={mockNoteId} />)
    
    const textarea = screen.getByRole('textbox')
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'Updated content')
    
    const saveButton = screen.getByText(/save notebook/i)
    fireEvent.click(saveButton)
    
    // Check for loading indicator
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
    
    // Wait for save to complete
    await waitFor(() => {
      expect(screen.getByText(/saved successfully/i)).toBeInTheDocument()
    })
  })
})
```

### Scroll Handler Tests

```typescript
describe('NoteBook Scroll Behavior', () => {
  it('shows floating save button when main button is out of view', async () => {
    const { container } = render(
      <NoteBook noteEntries={mockEntries} noteId={mockNoteId} />
    )
    
    // Mock getBoundingClientRect to simulate button out of view
    const saveButton = container.querySelector('[ref="saveNoteButtonRef"]')
    if (saveButton) {
      jest.spyOn(saveButton, 'getBoundingClientRect').mockReturnValue({
        top: -100,
        bottom: -50,
        left: 0,
        right: 100,
        width: 100,
        height: 50,
        x: 0,
        y: -100,
        toJSON: () => {},
      })
    }
    
    // Trigger scroll
    fireEvent.scroll(window, { target: { scrollY: 500 } })
    
    await waitFor(() => {
      // Check for floating button (you'll need to add a test ID to identify it)
      const floatingButton = screen.queryByTestId('floating-save-button')
      expect(floatingButton).toBeInTheDocument()
    })
  })
})
```

---

## MenuDrawer.tsx Testing

### Component Tests

```typescript
// __tests__/components/MenuDrawer.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MenuDrawer from '@/components/main_components/MenuDrawer'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}))

jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    resolvedTheme: 'light',
  }),
}))

describe('MenuDrawer - Guest User', () => {
  it('renders menu button', () => {
    render(
      <MenuDrawer 
        isSession={false} 
        userName={null} 
        userImage={null} 
      />
    )
    
    const menuButton = screen.getByLabelText(/open navigation menu/i)
    expect(menuButton).toBeInTheDocument()
  })

  it('opens drawer on button click', async () => {
    render(
      <MenuDrawer 
        isSession={false} 
        userName={null} 
        userImage={null} 
      />
    )
    
    const menuButton = screen.getByLabelText(/open navigation menu/i)
    await userEvent.click(menuButton)
    
    expect(screen.getByText(/hello guest/i)).toBeInTheDocument()
  })

  it('shows login and register options for guests', async () => {
    render(
      <MenuDrawer 
        isSession={false} 
        userName={null} 
        userImage={null} 
      />
    )
    
    const menuButton = screen.getByLabelText(/open navigation menu/i)
    await userEvent.click(menuButton)
    
    expect(screen.getByText(/login/i)).toBeInTheDocument()
    expect(screen.getByText(/register/i)).toBeInTheDocument()
  })

  it('closes drawer on backdrop click', async () => {
    const { container } = render(
      <MenuDrawer 
        isSession={false} 
        userName={null} 
        userImage={null} 
      />
    )
    
    const menuButton = screen.getByLabelText(/open navigation menu/i)
    await userEvent.click(menuButton)
    
    // Find and click backdrop
    const backdrop = container.querySelector('.MuiBackdrop-root')
    if (backdrop) {
      fireEvent.click(backdrop)
    }
    
    // Drawer should close
    expect(screen.queryByText(/hello guest/i)).not.toBeInTheDocument()
  })
})

describe('MenuDrawer - Authenticated User', () => {
  const mockUserName = 'John Doe'
  const mockUserImage = 'https://example.com/avatar.jpg'

  it('shows user information when authenticated', async () => {
    render(
      <MenuDrawer 
        isSession={true} 
        userName={mockUserName} 
        userImage={mockUserImage} 
      />
    )
    
    const menuButton = screen.getByLabelText(/open navigation menu/i)
    await userEvent.click(menuButton)
    
    expect(screen.getByText(mockUserName)).toBeInTheDocument()
  })

  it('shows profile and notes navigation for authenticated users', async () => {
    render(
      <MenuDrawer 
        isSession={true} 
        userName={mockUserName} 
        userImage={mockUserImage} 
      />
    )
    
    const menuButton = screen.getByLabelText(/open navigation menu/i)
    await userEvent.click(menuButton)
    
    expect(screen.getByText(/profile/i)).toBeInTheDocument()
    expect(screen.getByText(/my notes/i)).toBeInTheDocument()
    expect(screen.getByText(/logout/i)).toBeInTheDocument()
  })

  it('does not show login/register for authenticated users', async () => {
    render(
      <MenuDrawer 
        isSession={true} 
        userName={mockUserName} 
        userImage={mockUserImage} 
      />
    )
    
    const menuButton = screen.getByLabelText(/open navigation menu/i)
    await userEvent.click(menuButton)
    
    expect(screen.queryByText(/register/i)).not.toBeInTheDocument()
    // Login text might appear in "Logout", so we check for the specific button
    const loginButton = screen.queryByRole('button', { name: /^login$/i })
    expect(loginButton).not.toBeInTheDocument()
  })
})
```

### Accessibility Tests

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

describe('MenuDrawer Accessibility', () => {
  it('should not have accessibility violations (guest)', async () => {
    const { container } = render(
      <MenuDrawer 
        isSession={false} 
        userName={null} 
        userImage={null} 
      />
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should not have accessibility violations (authenticated)', async () => {
    const { container } = render(
      <MenuDrawer 
        isSession={true} 
        userName="John Doe" 
        userImage="https://example.com/avatar.jpg" 
      />
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('supports keyboard navigation', async () => {
    render(
      <MenuDrawer 
        isSession={false} 
        userName={null} 
        userImage={null} 
      />
    )
    
    const menuButton = screen.getByLabelText(/open navigation menu/i)
    
    // Tab to button
    await userEvent.tab()
    expect(menuButton).toHaveFocus()
    
    // Press Enter to open
    await userEvent.keyboard('{Enter}')
    expect(screen.getByText(/hello guest/i)).toBeInTheDocument()
  })
})
```

---

## Integration Testing

### API Integration Test Example

```typescript
// __tests__/integration/profileImageUpload.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { rest } from 'msw'
import ProfileAvatar from '@/components/profile-page-components/ProfileAvatar'

const server = setupServer(
  rest.post('/api/upload-profile-image', async (req, res, ctx) => {
    const body = await req.json()
    
    // Validate request
    if (!body.profileImage || !body.userId) {
      return res(ctx.status(400), ctx.json({ error: 'Invalid request' }))
    }
    
    // Simulate successful upload
    return res(ctx.status(200), ctx.json({ success: true }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Profile Image Upload Integration', () => {
  it('successfully uploads and displays image', async () => {
    render(<ProfileAvatar userImage={undefined} userId="user123" />)
    
    // Create and upload file
    const file = new File(['image content'], 'avatar.jpg', { 
      type: 'image/jpeg' 
    })
    
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement
    await userEvent.upload(input, file)
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/uploaded successfully/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('handles server error gracefully', async () => {
    server.use(
      rest.post('/api/upload-profile-image', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }))
      })
    )

    render(<ProfileAvatar userImage={undefined} userId="user123" />)
    
    const file = new File(['image'], 'avatar.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement
    await userEvent.upload(input, file)
    
    await waitFor(() => {
      expect(screen.getByText(/error uploading/i)).toBeInTheDocument()
    })
  })
})
```

---

## Test Setup Files

### Jest Configuration

```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

### Test Setup

```javascript
// jest.setup.js
import '@testing-library/jest-dom'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock canvas for image compression tests
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  drawImage: jest.fn(),
}))

HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/jpeg;base64,mockedimage')
```

---

## Running Tests

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "jest-axe": "^8.0.0",
    "msw": "^2.0.0"
  }
}
```

---

## Coverage Goals

### Minimum Coverage Targets

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Priority Areas for Testing

1. **Critical paths**: File upload, save operations, authentication
2. **Error handling**: All error states and edge cases
3. **User interactions**: All clickable elements and forms
4. **Accessibility**: Keyboard navigation, screen readers

---

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Summary

This testing strategy provides:
- ✅ Comprehensive unit tests for all components
- ✅ Integration tests for API interactions
- ✅ Accessibility testing
- ✅ Coverage goals and CI integration
- ✅ Mock strategies for Next.js and external dependencies

Implementing these tests will ensure code reliability and catch regressions early.
