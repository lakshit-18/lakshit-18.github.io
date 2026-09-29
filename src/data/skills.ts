export const skills: { group: string; items: string[] }[] = [
  { group: 'Languages', items: ['Java', 'C++', 'SQL'] },
  {
    group: 'Frameworks & Libraries',
    items: ['Spring Boot', 'Dropwizard', 'Spring Security', 'Spring Data JPA', 'Hibernate', 'Eureka', 'OpenFeign'],
  },
  { group: 'Databases', items: ['MySQL', 'PostgreSQL', 'MongoDB', 'AWS DynamoDB', 'Redis', 'Neo4j'] },
  { group: 'Cloud & Messaging', items: ['AWS SQS', 'AWS SNS', 'AWS Secrets Manager', 'Apache Kafka'] },
  {
    group: 'Tools & Platforms',
    items: ['Docker', 'Maven', 'Git', 'Ansible', 'JUnit', 'Mockito', 'Postman', 'Swagger', 'Datadog'],
  },
  {
    group: 'Concepts',
    items: [
      'Idempotency',
      'Distributed locking',
      'State machines',
      'Event-driven architecture',
      'Reconciliation',
      'Circuit breakers',
      'Canary rollouts',
    ],
  },
];
