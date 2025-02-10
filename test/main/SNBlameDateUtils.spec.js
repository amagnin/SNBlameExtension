import SNBlameDateUtils from "../../scripts/src/main/SNBlameDateUtils.js";

describe("SNBlameDateUtils", () => {
  let instance;

  beforeEach(() => {
    instance = new SNBlameDateUtils();
  });

  it("should return the same instance", () => {
    const anotherInstance = new SNBlameDateUtils();
    expect(instance).toBe(anotherInstance);
  });

  it("getFormattedDate should format date correctly", () => {
    const date = new Date("2023-10-05T14:48:00");
    const formattedDate = SNBlameDateUtils.getFormattedDate(date);
    expect(formattedDate).toBe("5. October 2023. at 14:48");
  });

  it('timeAgo should return "now" for recent dates', () => {
    const date = new Date();
    const timeAgo = SNBlameDateUtils.timeAgo(date);
    expect(timeAgo).toBe("now");
  });

  it('timeAgo should return "X seconds ago" for dates within the last minute', () => {
    const date = new Date(Date.now() - 30 * 1000);
    const timeAgo = SNBlameDateUtils.timeAgo(date);
    expect(timeAgo).toBe("30 seconds ago");
  });

  it('timeAgo should return "Today at HH:MM" for dates today', () => {
    const date = new Date();
    let day = date.getDate();

    date.setHours(date.getHours() - 1);
    let dayOneHourAgo = date.getDate();

    const timeAgo = SNBlameDateUtils.timeAgo(date);

    if (day === dayOneHourAgo) {
      expect(timeAgo).toContain("Today at");
    } else {
      /*with out this test will fail if the test is run at midnight*/
      expect(timeAgo).toContain("Yesterday at");
    }
  });

  it('timeAgo should return "Yesterday at HH:MM" for dates yesterday', () => {
    const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const timeAgo = SNBlameDateUtils.timeAgo(date);
    expect(timeAgo).toContain("Yesterday at");
  });

  it('timeAgo should return "DD. MM at HH:MM" for dates this year', () => {
    let date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const timeAgo = SNBlameDateUtils.timeAgo(date);
    // 10. January at 14:48
    expect(timeAgo).toMatch(/\d{1,2}\. \w* at \d{2}:\d{2}/);
  });

  it('timeAgo should return "DD. MM YYYY at HH:MM" for dates in previous years', () => {
    const date = new Date("2022-05-15T14:48:00");
    const timeAgo = SNBlameDateUtils.timeAgo(date);
    expect(timeAgo).toBe("15. May 2022. at 14:48");
  });
});
