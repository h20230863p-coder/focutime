import { Interest, InterestCategory, Suggestion } from '../types';

export const INTERESTS: Interest[] = [
  {
    id: 'fitness',
    label: 'Fitness',
    icon: '💪',
    description: 'Quick workouts, stretches, or a brisk walk',
  },
  {
    id: 'reading',
    label: 'Reading',
    icon: '📚',
    description: 'Read articles, books, or newsletters',
  },
  {
    id: 'learning',
    label: 'Learning',
    icon: '🧠',
    description: 'Take a course, watch a tutorial, or learn something new',
  },
  {
    id: 'meditation',
    label: 'Meditation',
    icon: '🧘',
    description: 'Mindfulness exercises and breathing techniques',
  },
  {
    id: 'news',
    label: 'News',
    icon: '📰',
    description: 'Catch up on curated news and industry updates',
  },
  {
    id: 'skills',
    label: 'Skills',
    icon: '🛠️',
    description: 'Practice coding, writing, design, or other skills',
  },
];

export const SUGGESTIONS: Record<InterestCategory, Suggestion[]> = {
  fitness: [
    { id: 'fit-1', category: 'fitness', title: '5-Min Stretch', description: 'Loosen up with desk-friendly stretches', action: 'Stand up & stretch' },
    { id: 'fit-2', category: 'fitness', title: 'Walk Break', description: 'Step away from the screen for a quick walk', action: 'Go for a walk' },
    { id: 'fit-3', category: 'fitness', title: 'Bodyweight Circuit', description: '20 squats, 10 pushups, 30s plank', action: 'Start workout' },
  ],
  reading: [
    { id: 'read-1', category: 'reading', title: 'Saved Articles', description: 'Catch up on those tabs you saved for later', action: 'Open reader' },
    { id: 'read-2', category: 'reading', title: 'Book Chapter', description: 'Read one chapter of your current book', action: 'Open book' },
    { id: 'read-3', category: 'reading', title: 'Newsletter Digest', description: 'Quick scan of today\'s top newsletters', action: 'Check inbox' },
  ],
  learning: [
    { id: 'learn-1', category: 'learning', title: 'Micro Course', description: 'Complete one short lesson on a new topic', action: 'Start lesson' },
    { id: 'learn-2', category: 'learning', title: 'Tutorial Video', description: 'Watch a 5-10 min tutorial', action: 'Watch video' },
    { id: 'learn-3', category: 'learning', title: 'Flashcards', description: 'Review flashcards for language or concepts', action: 'Review cards' },
  ],
  meditation: [
    { id: 'med-1', category: 'meditation', title: 'Deep Breathing', description: '1-minute of box breathing (4-4-4-4)', action: 'Breathe' },
    { id: 'med-2', category: 'meditation', title: 'Body Scan', description: 'Quick 3-min body awareness exercise', action: 'Start scan' },
    { id: 'med-3', category: 'meditation', title: 'Mindful Minute', description: 'Close your eyes and focus on your breath for 60s', action: 'Begin' },
  ],
  news: [
    { id: 'news-1', category: 'news', title: 'Tech Briefing', description: '5 top tech stories in under 3 minutes', action: 'Read briefing' },
    { id: 'news-2', category: 'news', title: 'Industry Updates', description: 'Latest developments in your field', action: 'Browse updates' },
    { id: 'news-3', category: 'news', title: 'Daily Digest', description: 'Curated news from trusted sources', action: 'Open digest' },
  ],
  skills: [
    { id: 'skill-1', category: 'skills', title: 'Code Practice', description: 'Solve a coding challenge on LeetCode or similar', action: 'Start coding' },
    { id: 'skill-2', category: 'skills', title: 'Writing Prompt', description: 'Write 200 words on a topic of your choice', action: 'Start writing' },
    { id: 'skill-3', category: 'skills', title: 'Design Exercise', description: 'Redesign a simple UI element in 10 minutes', action: 'Open design tool' },
  ],
};