const date = (value) => new Date(value);

export function memoryRepo() {
  const rooms = new Map([
    ['room-1', { id: 'room-1', name: 'Room 1' }],
    ['room-2', { id: 'room-2', name: 'Room 2' }],
    ['room-3', { id: 'room-3', name: 'Room 3' }],
    ['room-4', {
      id: 'room-4',
      name: 'Room 4',
      maintenanceStart: date('2026-11-05T00:00:00Z'),
      maintenanceEnd: date('2026-11-08T00:00:00Z'),
    }],
  ]);
  const members = new Map(['member-1', 'member-2', 'member-3'].map((id) => [id, { id }]));
  const bookings = new Map([
    ['booking-1', {
      id: 'booking-1',
      roomId: 'room-1',
      memberId: 'member-1',
      start: date('2026-11-03T18:00:00Z'),
      end: date('2026-11-03T20:00:00Z'),
      status: 'confirmed',
    }],
    ['booking-2', {
      id: 'booking-2',
      roomId: 'room-2',
      memberId: 'member-1',
      start: date('2026-11-04T10:00:00Z'),
      end: date('2026-11-04T12:00:00Z'),
      status: 'confirmed',
    }],
    ['booking-3', {
      id: 'booking-3',
      roomId: 'room-2',
      memberId: 'member-3',
      start: date('2026-11-02T19:00:00Z'),
      end: date('2026-11-02T21:00:00Z'),
      status: 'confirmed',
    }],
    ['booking-4', {
      id: 'booking-4',
      roomId: 'room-3',
      memberId: 'member-2',
      start: date('2026-11-01T10:00:00Z'),
      end: date('2026-11-01T12:00:00Z'),
      status: 'confirmed',
    }],
    ['booking-5', {
      id: 'booking-5',
      roomId: 'room-3',
      memberId: 'member-2',
      start: date('2026-11-04T10:00:00Z'),
      end: date('2026-11-04T12:00:00Z'),
      status: 'confirmed',
    }],
  ]);

  const repo = {
    listRooms: async () => [...rooms.values()],
    getRoom: async (id) => rooms.get(id) ?? null,
    getMember: async (id) => members.get(id) ?? null,
    getBooking: async (id) => bookings.get(id) ?? null,
    listRoomBookings: async (roomId, from, to) => [...bookings.values()].filter((booking) =>
      booking.roomId === roomId
      && booking.status === 'confirmed'
      && booking.start < to
      && from < booking.end),
    listMemberBookings: async (memberId) => [...bookings.values()].filter((booking) =>
      booking.memberId === memberId),
    transaction: async (callback) => callback({
      lockMember: async () => {},
      countUpcoming: async (memberId, now) => [...bookings.values()].filter((booking) =>
        booking.memberId === memberId
        && booking.status === 'confirmed'
        && booking.start > now).length,
      activeInRoom: async (roomId, start, end) => [...bookings.values()].filter((booking) =>
        booking.roomId === roomId
        && booking.status === 'confirmed'
        && booking.start < end
        && start < booking.end),
      insertBooking: async (booking) => {
        bookings.set(booking.id, booking);
      },
      getBookingForUpdate: async (id) => bookings.get(id) ?? null,
      updateStatus: async (id, status) => {
        const booking = bookings.get(id);
        if (booking) bookings.set(id, { ...booking, status });
      },
    }),
  };

  return repo;
}
