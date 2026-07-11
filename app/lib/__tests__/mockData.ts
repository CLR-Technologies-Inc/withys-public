import type { SampleEntry, SampleContact, SampleTag } from '../sampleData';

export const SAMPLE_ENTRIES: SampleEntry[] = [
  {
    id: '1',
    entry_date: '2025-07-01',
    contact_name: 'John',
    location: 'BJ Grocery Store',
    raw_text: `2025-07-01 John | BJ Grocery Store
    We talked about potatoes and his new job at the farm  ; relationship:friend
    He mentioned wanting to start a garden next spring
    equity:start            $-10`,
    tags: ['relationship:friend'],
    source: 'manual',
    status: 'approved',
  },
  {
    id: '2',
    entry_date: '2025-07-03',
    contact_name: 'Sarah',
    location: 'Coffee House',
    raw_text: `2025-07-03 Sarah | Coffee House
    Caught up over lattes, she's considering a career change  ; relationship:friend, topic:career
    She asked about my project, I showed her the app
    expenses:coffee            $-8`,
    tags: ['relationship:friend', 'topic:career'],
    source: 'manual',
    status: 'approved',
  },
  {
    id: '3',
    entry_date: '2025-07-05',
    contact_name: 'Mike',
    location: 'Office',
    raw_text: `2025-07-05 Mike | Office
    Discussed Q3 roadmap and team expansion  ; relationship:colleague, topic:work
    He's looking to hire two more engineers
    equity:work            $0`,
    tags: ['relationship:colleague', 'topic:work'],
    source: 'manual',
    status: 'approved',
  },
  {
    id: '4',
    entry_date: '2025-07-08',
    contact_name: 'Mom',
    location: 'Phone Call',
    raw_text: `2025-07-08 Mom | Phone Call
    Weekly check-in, she's doing well  ; relationship:family
    Dad's birthday is coming up, need to plan something
    gifts:birthday            $-50`,
    tags: ['relationship:family'],
    source: 'manual',
    status: 'approved',
  },
  {
    id: '5',
    entry_date: '2025-07-10',
    contact_name: 'Alex',
    location: 'Gym',
    raw_text: `2025-07-10 Alex | Gym
    Worked out together, he beat his deadlift PR  ; relationship:friend, topic:fitness
    We're planning a hiking trip for August`,
    tags: ['relationship:friend', 'topic:fitness'],
    source: 'manual',
    status: 'approved',
  },
  {
    id: '6',
    entry_date: '2025-07-15',
    contact_name: 'Dr. Patel',
    location: 'Clinic',
    raw_text: `2025-07-15 Dr. Patel | Clinic
    Annual checkup, everything looks good  ; relationship:professional, topic:health
    Follow up in 6 months
    expenses:medical            $-25`,
    tags: ['relationship:professional', 'topic:health'],
    source: 'manual',
    status: 'approved',
  },
  {
    id: '7',
    entry_date: '2025-07-18',
    contact_name: 'Sarah',
    location: 'Park',
    raw_text: `2025-07-18 Sarah | Park
    Went for a walk and brainstormed business ideas  ; relationship:friend, topic:business
    She's leaning towards starting a consulting firm`,
    tags: ['relationship:friend', 'topic:business'],
    source: 'manual',
    status: 'approved',
  },
  {
    id: '8',
    entry_date: '2025-07-22',
    contact_name: 'John',
    location: 'His House',
    raw_text: `2025-07-22 John | His House
    BBQ at John's place, met his sister  ; relationship:friend, event:social
    Great evening, he makes amazing ribs
    gifts:wine            $-15`,
    tags: ['relationship:friend', 'event:social'],
    source: 'manual',
    status: 'approved',
  },
  {
    id: '9',
    entry_date: '2025-06-12',
    contact_name: 'Sarah',
    location: 'Her Apartment',
    raw_text: `2025-06-12 Sarah | Her Apartment
    Helped her move some furniture  ; relationship:friend, event:favor
    She ordered pizza as a thank you
    expenses:food            $0`,
    tags: ['relationship:friend', 'event:favor'],
    source: 'manual',
    status: 'approved',
  },
  {
    id: '10',
    entry_date: '2025-06-20',
    contact_name: 'Mike',
    location: 'Conference Room B',
    raw_text: `2025-06-20 Mike | Conference Room B
    One-on-one about the new project timeline  ; relationship:colleague, topic:work
    Agreed on the two-week sprint cadence`,
    tags: ['relationship:colleague', 'topic:work'],
    source: 'manual',
    status: 'approved',
  },
  {
    id: '11',
    entry_date: '2025-06-25',
    contact_name: 'Mom',
    location: 'Video Call',
    raw_text: `2025-06-25 Mom | Video Call
    Showed her photos from the weekend trip  ; relationship:family
    She wants to visit next month`,
    tags: ['relationship:family'],
    source: 'manual',
    status: 'approved',
  },
  {
    id: '12',
    entry_date: '2025-08-02',
    contact_name: 'Alex',
    location: 'Trailhead Parking',
    raw_text: `2025-08-02 Alex | Trailhead Parking
    Finally did the hiking trip!  ; relationship:friend, topic:fitness, event:outdoors
    10 miles round trip, incredible views at the summit
    expenses:gas            $-20`,
    tags: ['relationship:friend', 'topic:fitness', 'event:outdoors'],
    source: 'manual',
    status: 'approved',
  },
  {
    id: '13',
    entry_date: '2025-08-10',
    contact_name: 'Lisa',
    location: 'Art Gallery',
    raw_text: `2025-08-10 Lisa | Art Gallery
    Met Lisa at the downtown art walk  ; relationship:acquaintance, topic:art
    She's a ceramics artist, interesting work`,
    tags: ['relationship:acquaintance', 'topic:art'],
    source: 'manual',
    status: 'approved',
  },
  {
    id: '14',
    entry_date: '2025-08-15',
    contact_name: 'John',
    location: 'Phone Call',
    raw_text: `2025-08-15 John | Phone Call
    Quick call about the garden project  ; relationship:friend
    He started the raised beds, needs help with soil
    gifts:seeds            $-12`,
    tags: ['relationship:friend'],
    source: 'manual',
    status: 'approved',
  },
];

export const SAMPLE_CONTACTS: SampleContact[] = [
  { id: '1', name: 'John', relationship: 'friend', entry_count: 3, last_entry: '2025-08-15', emails: [{ address: 'john@example.com', tag: 'personal', is_preferred: true }], phone: '(555) 123-4567', city: 'Portland', company: 'Self-employed', notes: 'Loves gardening, great BBQ host', targetLevel: 'biweekly', preferences: [{ category: 'Wants', value: 'a new greenhouse' }, { category: 'Needs', value: 'help with soil' }] },
  { id: '2', name: 'Sarah', relationship: 'friend', entry_count: 3, last_entry: '2025-07-18', emails: [{ address: 'sarah@example.com', tag: 'personal', is_preferred: true }], phone: '(555) 234-5678', city: 'Portland', company: 'Acme Consulting', notes: 'Considering starting her own firm', targetLevel: 'weekly', preferences: [{ category: 'Wants', value: 'to travel to Japan' }, { category: 'NTH', value: 'more books on architecture' }] },
  { id: '3', name: 'Mike', relationship: 'colleague', entry_count: 2, last_entry: '2025-07-05', emails: [{ address: 'mike@company.com', tag: 'work', is_preferred: true }], phone: '(555) 345-6789', city: 'Seattle', company: 'TechCorp', notes: 'Engineering manager, expanding team', targetLevel: 'biweekly' },
  { id: '4', name: 'Mom', relationship: 'family', entry_count: 2, last_entry: '2025-07-08', phone: '(555) 456-7890', city: 'Denver', targetLevel: 'weekly' },
  { id: '5', name: 'Alex', relationship: 'friend', entry_count: 2, last_entry: '2025-08-02', emails: [{ address: 'alex@example.com', tag: 'personal', is_preferred: true }], phone: '(555) 567-8901', city: 'Portland', notes: 'Gym buddy, beat his deadlift PR', targetLevel: 'weekly' },
  { id: '6', name: 'Dr. Patel', relationship: 'professional', entry_count: 1, last_entry: '2025-07-15', phone: '(555) 678-9012', city: 'Portland', company: 'City Health Clinic', targetLevel: 'quarterly' },
  { id: '7', name: 'Lisa', relationship: 'acquaintance', entry_count: 1, last_entry: '2025-08-10', emails: [{ address: 'lisa@artworld.com', tag: 'work', is_preferred: true }], city: 'Portland', company: 'Independent Artist', notes: 'Ceramics artist, met at art walk', targetLevel: 'monthly' },
];

export const SAMPLE_TAGS: SampleTag[] = [
  { id: '1', name: 'relationship:friend', entry_count: 8 },
  { id: '2', name: 'relationship:family', entry_count: 2 },
  { id: '3', name: 'relationship:colleague', entry_count: 2 },
  { id: '4', name: 'relationship:professional', entry_count: 1 },
  { id: '5', name: 'relationship:acquaintance', entry_count: 1 },
  { id: '6', name: 'topic:career', entry_count: 1 },
  { id: '7', name: 'topic:work', entry_count: 2 },
  { id: '8', name: 'topic:fitness', entry_count: 2 },
  { id: '9', name: 'topic:health', entry_count: 1 },
  { id: '10', name: 'topic:business', entry_count: 1 },
  { id: '11', name: 'topic:art', entry_count: 1 },
  { id: '12', name: 'event:social', entry_count: 1 },
  { id: '13', name: 'event:favor', entry_count: 1 },
  { id: '14', name: 'event:outdoors', entry_count: 1 },
];

describe('mockData fixtures', () => {
  it('has mock data arrays loaded', () => {
    expect(SAMPLE_ENTRIES.length).toBeGreaterThan(0);
    expect(SAMPLE_CONTACTS.length).toBeGreaterThan(0);
    expect(SAMPLE_TAGS.length).toBeGreaterThan(0);
  });
});
