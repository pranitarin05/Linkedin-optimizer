export interface ProfileSection {
  headline: SectionData
  about: SectionData
  experience: ExperienceEntry[]
  education: EducationEntry[]
  skills: SkillEntry[]
  featured: FeaturedEntry[]
  certifications: CertificationEntry[]
  recommendations: RecommendationEntry[]
  contactInfo: ContactInfo
}

export interface SectionData {
  text: string
  length: number
  exists: boolean
}

export interface ExperienceEntry {
  title: string
  company: string
  location: string
  startDate: string
  endDate: string
  description: string
  isCurrent: boolean
}

export interface EducationEntry {
  school: string
  degree: string
  field: string
  startDate: string
  endDate: string
}

export interface SkillEntry {
  name: string
  endorsements: number
}

export interface FeaturedEntry {
  type: string
  title: string
  url: string
  description: string
}

export interface CertificationEntry {
  name: string
  organization: string
  issueDate: string
  credentialUrl: string
  credentialId: string
}

export interface RecommendationEntry {
  author: string
  text: string
}

export interface ContactInfo {
  email: string
  website: string
  phone: string
  location: string
}

export interface ScrapedProfile {
  profileUrl: string
  scrapedAt: string
  sections: ProfileSection
}

export interface ScoringResult {
  overallScore: number
  sections: Record<string, SectionScore>
}

export interface SectionScore {
  score: number
  status: 'excellent' | 'good' | 'needs_work' | 'critical'
  issues: string[]
  tips: string[]
}

export interface ContentGenerationRequest {
  source: 'cv' | 'custom'
  section: string
  customText?: string
  cvFileBase64?: string
  targetRole?: string
  keywords?: string[]
}

export interface ContentGenerationResponse {
  draft: string
  matchScore: number
  section: string
  source: string
  appliedRules: string[]
}

export interface ProfileUpdate {
  id?: string
  userId: string
  section: string
  oldValue: string
  newValue: string
  source: 'cv' | 'custom'
  status: 'pending' | 'approved' | 'synced' | 'manual_copy' | 'deep_linked' | 'failed'
  approvedAt?: string
  createdAt?: string
}

export interface Persona {
  id: 'job_seeker' | 'career_coach' | 'service_provider' | 'general'
  label: string
  description: string
}

export const PERSONAS: Persona[] = [
  { id: 'job_seeker', label: 'Job Seeker', description: 'Actively looking for work, optimizing for recruiters' },
  { id: 'career_coach', label: 'Career Coach', description: 'Helping others optimize their profiles' },
  { id: 'service_provider', label: 'Service Provider', description: 'Freelancer or consultant seeking clients' },
  { id: 'general', label: 'General', description: 'Maintaining a strong professional presence' },
]
