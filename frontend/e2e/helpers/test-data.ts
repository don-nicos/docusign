export const TEST_USERS = {
  owner1: {
    email: 'owner1@techcorp.cl',
    password: 'Test1234!',
    name: 'Carlos Dueño TechCorp',
    role: 'OWNER',
    organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    organizationName: 'TechCorp SpA',
    userId: '11111111-1111-1111-1111-111111111111'
  },
  admin1: {
    email: 'admin1@techcorp.cl',
    password: 'Test1234!',
    name: 'Ana Admin TechCorp',
    role: 'ADMIN',
    organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    organizationName: 'TechCorp SpA',
    userId: '22222222-2222-2222-2222-222222222222'
  },
  member1: {
    email: 'member1@techcorp.cl',
    password: 'Test1234!',
    name: 'Luis Miembro TechCorp',
    role: 'MEMBER',
    organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    organizationName: 'TechCorp SpA',
    userId: '33333333-3333-3333-3333-333333333333'
  },
  owner2: {
    email: 'owner2@innosoft.cl',
    password: 'Test1234!',
    name: 'María Dueña InnoSoft',
    role: 'OWNER',
    organizationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    organizationName: 'InnoSoft Limitada',
    userId: '44444444-4444-4444-4444-444444444444'
  },
  admin2: {
    email: 'admin2@innosoft.cl',
    password: 'Test1234!',
    name: 'Pedro Admin InnoSoft',
    role: 'ADMIN',
    organizationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    organizationName: 'InnoSoft Limitada',
    userId: '55555555-5555-5555-5555-555555555555'
  },
  member2: {
    email: 'member2@innosoft.cl',
    password: 'Test1234!',
    name: 'Sofia Miembro InnoSoft',
    role: 'MEMBER',
    organizationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    organizationName: 'InnoSoft Limitada',
    userId: '66666666-6666-6666-6666-666666666666'
  }
};

export const API_ENDPOINTS = {
  auth: 'http://localhost:8081',
  document: 'http://localhost:8082',
  signature: 'http://localhost:8083',
  notification: 'http://localhost:8084',
  payment: 'http://localhost:8085'
};
