export const site = {
  name: 'Lakshit Lohar',
  title: 'Backend Software Engineer | Java, Spring Boot, Microservices',
  jobTitle: 'Backend Software Engineer',
  employer: 'Standard Chartered Research and Technology (SOLV)',
  role: 'SDE 1 – Backend (Java)',
  email: 'lakshitlohar02@gmail.com',
  phoneDisplay: '+91 89054 99569',
  phoneTel: 'tel:+918905499569',
  linkedin: 'https://linkedin.com/in/lakshit-lohar-2758991bb',
  github: 'https://github.com/lakshit-18',
  location: 'Bengaluru, India',
  connecthubRepo: 'https://github.com/lakshit-18/ConnectHub',
  url: 'https://lakshit-18.github.io',
  description:
    'Backend Software Engineer building high-reliability checkout and payment systems on Java microservices — idempotency, reconciliation, PayU/Razorpay integrations, and event-driven architecture.',
  metricsLabel: 'Production metrics · 30-day window · Sep 2026',
  resumePath: '/resume.pdf',
  resumeFilename: 'Lakshit_Lohar_Resume.pdf',
};

export const nav = [
  { label: 'Work', href: '/#work' },
  { label: 'Projects', href: '/#projects' },
  { label: 'Writing', href: '/#writing' },
  { label: 'Skills', href: '/#skills' },
  { label: 'Contact', href: '/#contact' },
];

export const impactMetrics = [
  { value: '~25K', label: 'orders / month through checkout', sub: '99.57% payment-to-order completion' },
  { value: '~563K', label: 'payment orders / month on the gateway', sub: '99.56% success' },
  { value: '99.8%', label: 'payment completion success', sub: 'Redis locks · backoff polling · deferred capture' },
  { value: '~800K', label: 'messages / month moved to SQS', sub: '99.94% consumer success' },
];

export const workCards = [
  {
    slug: 'checkout-platform',
    title: 'Checkout Platform',
    status: 'Production',
    tagline: 'An 11-state, checkpoint-resumable checkout across 5 microservices.',
    chips: ['~25K orders/mo', '99.57% completion'],
    stack: 'Java · Spring Boot · MySQL · DynamoDB',
  },
  {
    slug: 'payment-gateways',
    title: 'Payment Gateways — PayU & Razorpay',
    status: 'Production',
    tagline: 'One gateway abstraction, six payment channels, zero caller changes.',
    chips: ['~563K orders/mo', '99.8% completion'],
    stack: 'Java · Dropwizard · Redis · MySQL',
  },
  {
    slug: 'reconciliation-and-failover',
    title: 'Reconciliation & Failover',
    status: 'Production',
    tagline: 'Catching stuck payments and staying up through gateway outages.',
    chips: ['±1 paisa checks', 'Circuit breaker'],
    stack: 'Java · SQS · Datadog',
  },
  {
    slug: 'kafka-to-sqs-migration',
    title: 'Kafka → AWS SQS/SNS Migration',
    status: 'Production',
    tagline: 'Moving payment events between buses with zero downtime.',
    chips: ['~800K msgs/mo', '99.94% success'],
    stack: 'Kafka · AWS SQS/SNS · Ansible',
  },
  {
    slug: 'profile-update-platform',
    title: 'Profile Update Platform',
    status: 'System design',
    tagline: 'A self-service, auditable KYC and profile-correction platform across 9 services.',
    chips: ['9 services', '~4–7 ops / review'],
    stack: 'DynamoDB · Java',
  },
  {
    slug: 'security-secret-remediation',
    title: 'Org-wide Secret Remediation',
    status: 'Production',
    tagline: 'Leading a team of 5 to remove hardcoded secrets across the organization.',
    chips: ['Team of 5', 'Zero prod impact'],
    stack: 'gitleaks · AWS Secrets Manager · Ansible Vault',
  },
] as const;
