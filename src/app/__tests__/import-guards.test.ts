import Sidebar from '@/components/Sidebar';
import { NAV_SECTIONS } from '@config/navigation';
test('nav SSOT exists', () => expect(Array.isArray(NAV_SECTIONS)).toBe(true));
test('Sidebar is importable', () => expect(typeof Sidebar).toBe('function'));
