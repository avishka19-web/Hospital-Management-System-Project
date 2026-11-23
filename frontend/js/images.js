// All stock photography lives here. To use local copies instead, download the images into
// frontend/assets/images/ and replace the URLs below with e.g. 'assets/images/hero.jpg'.
(function () {
  const U = (id, w = 1000) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
  window.IMG = {
    hero: U('1576091160399-112ba8d25d1d', 1400),
    building: U('1587351021759-3e566b6af7cc', 1200),
    consultation: U('1576091160550-2173dba999ef', 1200),
    patientCare: U('1584515933487-779824d29309', 1200),
    ward: U('1519494026892-80bbd2d6fd0d', 1200),
    lab: U('1579684385127-1ef15d508118', 1000),
    imaging: U('1530026186672-2cd00ffc50fe', 1000),
    team: U('1537368910025-700350fe46c7', 1200),
    loginSide: U('1631217868264-e5b90bb7e133', 1400),
    avatars: [U('1612349317150-e413f6a5b16d', 200), U('1559839734-2b71ea197ec2', 200), U('1594824476967-48c8b964273f', 200)]
  };
})();
