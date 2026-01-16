export class UserMinimalDto {
  id: string;
  firstname: string;
  lastname: string;
}

export class SessionRatingDto {
  id: string;
  score: number;
  comment: string | null;
  raterId: string;
  updatedAt: string;
}

export class SessionParticipantDto {
  attendanceId: string;
  user: UserMinimalDto;
  status: 'YES' | 'NO';
  comment: string | null;
  respondedAt: string;
  outOfContract: boolean;
  createdByAdmin: boolean;
  rating: SessionRatingDto | null;
}

export class SessionDashboardDto {
  id: string;
  site: {
    id: string;
    name: string;
  };
  date: string;
  slot: 'AM' | 'PM';
  startTime: string | null;
  endTime: string | null;
  isPublished: boolean;
  isCanceled: boolean;
  notes: string | null;
  participants: SessionParticipantDto[];
}

export class ManorStayDto {
  id: string;
  user: UserMinimalDto;
  status: 'PLANNED' | 'CANCELED';
  overCapacity: boolean;
  createdByAdmin: boolean;
  updatedAt: string;
}

export class ManorDashboardDto {
  id: string;
  name: string;
  city: string | null;
  capacity: number;
  enforceCapacity: boolean;
  stays: ManorStayDto[];
}

export class TransportBookingDto {
  id: string;
  user: UserMinimalDto;
  seats: number;
  status: 'CONFIRMED' | 'CANCELLED';
  updatedAt: string;
}

export class TransportDashboardDto {
  occurrenceId: string;
  template: {
    id: string;
    name: string;
    fromLabel: string;
    toLabel: string;
  };
  departureAt: string;
  status: 'SCHEDULED' | 'CANCELLED';
  capacity: number;
  allowOverbook: boolean;
  bookings: TransportBookingDto[];
}

export class AdminDashboardResponseDto {
  date: string;
  dayStartUtc: string;
  dayEndUtc: string;
  sessions: SessionDashboardDto[];
  manors: ManorDashboardDto[];
  transports: TransportDashboardDto[];
}
