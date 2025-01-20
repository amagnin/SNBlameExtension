/**
 * Class used to transform a date into human readable format
 * @class
 * 
 */
class SNBlameDateUtils {
  constructor() {
    if (typeof SNBlameDateUtils.instance === "object")
      return SNBlameDateUtils.instance;

    SNBlameDateUtils.instance = this;
    return this;
  }

  /**
   * returns the given date in a human readable format, used internaly form the SNBlameDateUtils
   * 
   * @param {Date} date date to format
   * @param {boolean | string} [prefomattedDate = false] if not false, will use the preformated date passed and just add hours and minutes
   * @param {boolean} [hideYear = false] if true will not show the year, ignored id preformatedDate is not false
   * @returns {string}
   */
  static getFormattedDate(date, prefomattedDate = false, hideYear = false) {
    const MONTH_NAMES = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const day = date.getDate();
    const month = MONTH_NAMES[date.getMonth()];
    const year = date.getFullYear();
    const hours = `0${date.getHours()}`.slice(-2);
    let minutes = `0${date.getMinutes()}`.slice(-2);

    if (prefomattedDate) {
      return `${prefomattedDate} at ${hours}:${minutes}`;
    }

    if (hideYear) {
      return `${day}. ${month} at ${hours}:${minutes}`;
    }

    return `${day}. ${month} ${year}. at ${hours}:${minutes}`;
  }

  /**
   * returns the given date in a human readable format, depending on how long ago was the date is will return
   * now, 
   * X seconds ago, 
   * X minutes ago, 
   * Today, 
   * Yesterday, 
   * DD. MM at HH:SS, 
   * DD. MM YYYY at HH:SS
   * 
   * @param {string | number | Date} dateParam date to transform in a human redable date
   * @returns {string}
   */
  static timeAgo(dateParam) {
    if (!dateParam) {
      return null;
    }

    const date = typeof dateParam === "object" ? dateParam : new Date(dateParam);
    const DAY_IN_MS = 86400000; // 24 * 60 * 60 * 1000
    const today = new Date();
    const yesterday = new Date(today - DAY_IN_MS);
    const seconds = Math.round((today - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const isToday = today.toDateString() === date.toDateString();
    const isYesterday = yesterday.toDateString() === date.toDateString();
    const isThisYear = today.getFullYear() === date.getFullYear();

    if (seconds < 5) {
      return "now";
    } else if (seconds < 60) {
      return `${seconds} seconds ago`;
    } else if (seconds < 90) {
      return "about a minute ago";
    } else if (minutes < 60) {
      return `${minutes} minutes ago`;
    } else if (isToday) {
      return SNBlameDateUtils.getFormattedDate(date, "Today");
    } else if (isYesterday) {
      return SNBlameDateUtils.getFormattedDate(date, "Yesterday");
    } else if (isThisYear) {
      return SNBlameDateUtils.getFormattedDate(date, false, true);
    }

    return SNBlameDateUtils.getFormattedDate(date);
  }
}

export default SNBlameDateUtils;
